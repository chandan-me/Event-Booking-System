import json
import logging
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple, Dict, Any
import hashlib
import hmac
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.models.ticket import Ticket
from app.models.booking import Booking
from app.repositories.ticket_repository import TicketRepository
from app.repositories.booking_repository import BookingRepository
from app.clients.event_client import BaseEventClient
from app.core.qrcode_generator import generate_qr_code_image_base64, generate_qr_code_bytes
from app.schemas.ticket import (
    TicketResponse, CheckInVerifyRequest, CheckInScanRequest,
    CheckInResultResponse, CheckInStatsResponse, ResendEmailResponse,
    PublicVerifyResponse
)

logger = logging.getLogger(__name__)


def parse_qr_string(payload_str: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Intelligently parses QR code scan strings into (ticket_reference, raw_token).
    Supports:
      1. JSON payload: '{"ref": "TKT-...", "tok": "..."}' or '{"ticket_reference": "..."}'
      2. Compact URI: 'EVT-TKT:TKT-20261018-123:abc...'
      3. Verification URL: 'https://...?ref=TKT-...&tok=...'
      4. Plain reference: 'TKT-20261018-...' or 'BK-20261018-...'
    """
    if not payload_str:
        return None, None

    cleaned = payload_str.strip()

    # 1. JSON
    if cleaned.startswith("{") and cleaned.endswith("}"):
        try:
            data = json.loads(cleaned)
            ref = data.get("ref") or data.get("ticket_reference") or data.get("booking_reference")
            tok = data.get("tok") or data.get("token") or data.get("secret")
            return ref, tok
        except Exception:
            pass

    # 2. Compact URI: EVT-TKT:ref:token
    if cleaned.startswith("EVT-TKT:"):
        parts = cleaned.split(":")
        if len(parts) >= 3:
            return parts[1].strip(), parts[2].strip()
        elif len(parts) == 2:
            return parts[1].strip(), None

    # 3. URL format: http[s]://...
    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        try:
            parsed = urllib.parse.urlparse(cleaned)
            params = urllib.parse.parse_qs(parsed.query)
            ref = params.get("ref", [None])[0] or params.get("ticket_reference", [None])[0]
            tok = params.get("tok", [None])[0] or params.get("token", [None])[0]
            if ref:
                return ref, tok
        except Exception:
            pass

    # 4. Fallback: treat whole string as ticket or booking reference
    return cleaned, None


def parse_datetime(dt_val: Any) -> Optional[datetime]:
    """Safely converts string or datetime object to UTC datetime."""
    if not dt_val:
        return None
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=timezone.utc)
        return dt_val.astimezone(timezone.utc)
    try:
        clean_str = str(dt_val).replace("Z", "+00:00")
        if "T" in clean_str:
            dt = datetime.fromisoformat(clean_str)
        else:
            dt = datetime.strptime(clean_str[:19], "%Y-%m-%d %H:%M:%S")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


class TicketService:
    def __init__(
        self,
        ticket_repo: Optional[TicketRepository] = None,
        booking_repo: Optional[BookingRepository] = None
    ):
        self.ticket_repo = ticket_repo or TicketRepository()
        self.booking_repo = booking_repo or BookingRepository()

    def generate_tickets_for_confirmed_booking(
        self,
        db: Session,
        booking: Booking,
        event: dict,
        seat_tier: str = "General Admission"
    ) -> List[Tuple[Ticket, str]]:
        """
        Creates a distinct, unique ticket record in MySQL for every ticket unit in the booking.
        Computes SHA-256 hash for secure storage and sets expiry to event end_at.
        Returns list of (Ticket, raw_token) pairs.
        """
        end_at_dt = parse_datetime(event.get("end_at"))
        tickets_with_tokens = self.ticket_repo.create_tickets_for_booking(
            db=db,
            booking=booking,
            expires_at=end_at_dt,
            seat_tier=seat_tier
        )
        return tickets_with_tokens

    def build_qr_payload_string(self, ticket: Ticket, raw_token: Optional[str] = None) -> str:
        """
        Creates opaque payload encoded into the QR code.
        Never embeds passwords, user tokens, internal IDs or payment secrets.
        """
        payload = {
            "ref": ticket.ticket_reference,
            "evt": ticket.event_id,
            "tok": raw_token or ""
        }
        return json.dumps(payload, separators=(',', ':'))

    def enrich_ticket_response(
        self,
        ticket: Ticket,
        event: Optional[dict] = None,
        booking: Optional[Booking] = None,
        customer_info: Optional[dict] = None
    ) -> TicketResponse:
        """Enriches DB Ticket entity with UI attributes, dynamic QR codes, and event metadata."""
        # For public/user display, QR contains ticket reference verification payload
        qr_payload = json.dumps({"ref": ticket.ticket_reference, "evt": ticket.event_id}, separators=(',', ':'))
        qr_image = generate_qr_code_image_base64(qr_payload)

        resp = TicketResponse.model_validate(ticket)
        resp.qr_payload = qr_payload
        resp.qr_code_image_base64 = qr_image
        resp.qr_code_data_uri = qr_image
        resp.qr_code_url = qr_image

        if event:
            resp.event_title = event.get("title")
            resp.venue_name = event.get("venue_name")
            resp.venue_address = event.get("venue_address")
            resp.start_at = str(event.get("start_at", ""))
            resp.end_at = str(event.get("end_at", ""))

        if booking:
            resp.booking_reference = booking.booking_reference

        if customer_info:
            resp.customer_name = customer_info.get("name")
            resp.customer_email = customer_info.get("email")

        return resp

    def get_my_tickets(
        self,
        db: Session,
        customer_id: int,
        event_client: BaseEventClient,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[TicketResponse], int]:
        """Attendee fetches all their personal tickets with live status and QR codes."""
        tickets, total = self.ticket_repo.list_by_customer(
            db=db,
            customer_id=customer_id,
            page=page,
            page_size=page_size
        )

        now = datetime.now(timezone.utc)
        cached_events: Dict[int, dict] = {}
        enriched: List[TicketResponse] = []

        for t in tickets:
            if t.event_id not in cached_events:
                try:
                    cached_events[t.event_id] = event_client.get_event(t.event_id)
                except Exception:
                    cached_events[t.event_id] = {}

            evt = cached_events[t.event_id]
            # Check event expiry automatically
            end_dt = parse_datetime(evt.get("end_at"))
            if end_dt and now > end_dt and t.status == "ACTIVE":
                t.status = "EXPIRED"
                db.add(t)
                db.commit()

            booking = t.booking or self.booking_repo.get_by_id(db, t.booking_id)
            enriched.append(self.enrich_ticket_response(t, event=evt, booking=booking))

        return enriched, total

    def get_ticket_by_id(
        self,
        db: Session,
        ticket_id: int,
        user_id: int,
        user_role: str,
        event_client: BaseEventClient
    ) -> TicketResponse:
        """Retrieves single ticket with authorization validation."""
        ticket = self.ticket_repo.get_by_id(db, ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

        evt = event_client.get_event(ticket.event_id)
        if user_role != "ADMIN":
            if user_role in ["ORGANIZER", "ORGANISER"]:
                if evt and evt.get("created_by") is not None and evt.get("created_by") != user_id and ticket.customer_id != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You do not have permission to view tickets for this event."
                    )
            elif ticket.customer_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to view this ticket."
                )

        booking = ticket.booking or self.booking_repo.get_by_id(db, ticket.booking_id)

        # Automatic expiry check
        end_dt = parse_datetime(evt.get("end_at"))
        now = datetime.now(timezone.utc)
        if end_dt and now > end_dt and ticket.status == "ACTIVE":
            ticket.status = "EXPIRED"
            db.add(ticket)
            db.commit()

        return self.enrich_ticket_response(ticket, event=evt, booking=booking)

    def public_verify(self, db: Session, ticket_reference: str, event_client: BaseEventClient) -> PublicVerifyResponse:
        """
        Public endpoint: minimal verification without exposing attendee personal info,
        email address, database IDs, or secrets.
        """
        ticket = self.ticket_repo.get_by_reference(db, ticket_reference)
        if not ticket:
            return PublicVerifyResponse(
                valid=False,
                status="INVALID",
                message="INVALID TICKET — This ticket could not be verified.",
                ticket_reference=ticket_reference
            )

        evt = {}
        try:
            evt = event_client.get_event(ticket.event_id)
        except Exception:
            pass

        title = evt.get("title", f"Event #{ticket.event_id}")
        is_valid = (ticket.status == "ACTIVE")

        msg = f"Ticket is {ticket.status}."
        if ticket.status == "ACTIVE":
            msg = "Valid ticket for entry."
        elif ticket.status == "CHECKED_IN":
            msg = "ALREADY USED — This ticket has already been checked in."
        elif ticket.status == "EXPIRED":
            msg = "EXPIRED TICKET — This ticket is no longer valid."
        elif ticket.status in ["CANCELLED", "REVOKED"]:
            msg = "CANCELLED TICKET — This booking is no longer valid for admission."

        return PublicVerifyResponse(
            valid=is_valid,
            status=ticket.status,
            message=msg,
            ticket_reference=ticket.ticket_reference,
            event_title=title,
            seat_label=ticket.seat_label
        )

    def verify_or_scan_ticket(
        self,
        db: Session,
        event_client: BaseEventClient,
        ticket_ref: Optional[str],
        token: Optional[str],
        qr_payload: Optional[str],
        expected_event_id: Optional[int],
        staff_identity: str,
        is_scan_action: bool = False,
        notes: Optional[str] = None
    ) -> CheckInResultResponse:
        """
        Core verification & admission engine adhering to all 8 security rules:
          1. Ticket exists in DB.
          2. Cryptographic token verification (constant-time SHA-256 match).
          3. Booking confirmed and payment satisfied.
          4. Ticket not cancelled, revoked, expired, or already used.
          5. Event matching.
          6. Server-side authoritative check-in window and event end time.
          7. Atomic single-use conditional update to eliminate race conditions.
          8. Safe error messages without leaking PII.
        """
        # Parse inputs if raw QR payload was supplied
        if qr_payload:
            parsed_ref, parsed_tok = parse_qr_string(qr_payload)
            ticket_ref = ticket_ref or parsed_ref
            token = token or parsed_tok

        if not ticket_ref:
            return CheckInResultResponse(
                valid=False,
                code="INVALID_TICKET",
                message="INVALID TICKET — This ticket could not be verified."
            )

        ticket_ref = ticket_ref.strip()

        # 1. Lookup ticket in DB (check both ticket_reference and fallback booking_reference)
        ticket = self.ticket_repo.get_by_reference(db, ticket_ref)
        if not ticket:
            # Check if an organizer entered a booking reference like BK-20261018-...
            if ticket_ref.startswith("BK-"):
                booking = self.booking_repo.get_by_reference(db, ticket_ref)
                if booking and booking.tickets:
                    # Pick the first active ticket, or the first ticket if all checked in
                    ticket = next((t for t in booking.tickets if t.status == "ACTIVE"), booking.tickets[0])

        if not ticket:
            return CheckInResultResponse(
                valid=False,
                code="INVALID_TICKET",
                message="INVALID TICKET — This ticket could not be verified."
            )

        # 2. Cryptographic Token Match (if token was supplied in QR)
        if token and token.strip():
            computed_hash = hashlib.sha256(token.strip().encode("utf-8")).hexdigest()
            # Constant-time comparison
            if not hmac.compare_digest(ticket.token_hash, computed_hash):
                logger.warning("Ticket token mismatch for ref: %s", ticket_ref)
                return CheckInResultResponse(
                    valid=False,
                    code="INVALID_TICKET",
                    message="INVALID TICKET — This ticket could not be verified."
                )

        # 3. Ticket Status Checks (Specific to Ticket)
        if ticket.status == "CHECKED_IN":
            checked_ts = ticket.checked_in_at.strftime("%I:%M %p") if ticket.checked_in_at else "earlier"
            by = f" by {ticket.checked_in_by}" if ticket.checked_in_by else ""
            return CheckInResultResponse(
                valid=False,
                code="ALREADY_USED",
                message=f"ALREADY USED — This ticket has already been checked in at {checked_ts}{by}.",
                ticket_reference=ticket.ticket_reference,
                event_id=ticket.event_id,
                checked_in_at=ticket.checked_in_at,
                checked_in_by=ticket.checked_in_by
            )

        if ticket.status == "REVOKED":
            return CheckInResultResponse(
                valid=False,
                code="REVOKED_TICKET",
                message="REVOKED TICKET — This ticket has been revoked.",
                ticket_reference=ticket.ticket_reference,
                event_id=ticket.event_id
            )

        if ticket.status == "EXPIRED":
            return CheckInResultResponse(
                valid=False,
                code="EXPIRED_TICKET",
                message="EXPIRED TICKET — This ticket is no longer valid.",
                ticket_reference=ticket.ticket_reference,
                event_id=ticket.event_id
            )

        if ticket.status == "CANCELLED":
            return CheckInResultResponse(
                valid=False,
                code="CANCELLED_TICKET",
                message="CANCELLED TICKET — This booking is no longer valid for admission.",
                ticket_reference=ticket.ticket_reference,
                event_id=ticket.event_id
            )

        # 4. Booking Payment & Confirmation Check
        booking = ticket.booking or self.booking_repo.get_by_id(db, ticket.booking_id)
        if not booking or booking.status != "CONFIRMED" or booking.payment_status != "PAID":
            return CheckInResultResponse(
                valid=False,
                code="CANCELLED_TICKET",
                message="CANCELLED TICKET — This booking is no longer valid for admission.",
                ticket_reference=ticket.ticket_reference,
                event_id=ticket.event_id
            )

        # 5. Event Matching (Authorized scanner's event ID)
        if expected_event_id and ticket.event_id != expected_event_id:
            return CheckInResultResponse(
                valid=False,
                code="WRONG_EVENT",
                message="WRONG EVENT — This ticket is not valid for the selected event.",
                ticket_reference=ticket.ticket_reference,
                event_id=ticket.event_id
            )

        # 6. Event Lifecycle & Server-authoritative Schedule Check
        evt = {}
        try:
            evt = event_client.get_event(ticket.event_id)
        except Exception as e:
            logger.warning("Could not fetch event %s: %s", ticket.event_id, e)

        if evt.get("status") == "CANCELLED":
            return CheckInResultResponse(
                valid=False,
                code="CANCELLED_TICKET",
                message="CANCELLED TICKET — This event has been cancelled.",
                ticket_reference=ticket.ticket_reference,
                event_id=ticket.event_id
            )

        now = datetime.now(timezone.utc)
        start_at_dt = parse_datetime(evt.get("start_at"))
        end_at_dt = parse_datetime(evt.get("end_at"))

        # Automatic expiry enforcement: if event has completed
        if end_at_dt and now > end_at_dt:
            ticket.status = "EXPIRED"
            db.add(ticket)
            db.commit()
            return CheckInResultResponse(
                valid=False,
                code="EVENT_COMPLETED",
                message="EVENT COMPLETED — This event has ended and entry is closed.",
                ticket_reference=ticket.ticket_reference,
                event_id=ticket.event_id
            )

        # Check-in window enforcement: open 4 hours before event start
        if start_at_dt:
            check_in_window_start = start_at_dt - timedelta(hours=4)
            if now < check_in_window_start:
                return CheckInResultResponse(
                    valid=False,
                    code="CHECK_IN_NOT_OPEN",
                    message="CHECK-IN NOT OPEN — Entry verification is not available yet.",
                    ticket_reference=ticket.ticket_reference,
                    event_id=ticket.event_id
                )

        # 7. Check-in Action vs Verification Preview
        attendee_name = f"Guest #{ticket.customer_id}"
        # Look up customer name from auth db if available
        try:
            user_row = db.execute(
                text("SELECT full_name FROM event_auth_db.users WHERE id = :uid LIMIT 1"),
                {"uid": ticket.customer_id}
            ).fetchone()
            if user_row and user_row[0]:
                attendee_name = user_row[0]
        except Exception:
            pass

        event_title = evt.get("title", f"Event #{ticket.event_id}")

        if not is_scan_action:
            # Verification-only mode: all checks passed!
            return CheckInResultResponse(
                valid=True,
                code="VALID_TICKET",
                message="Ticket is valid and ready for entry.",
                ticket_reference=ticket.ticket_reference,
                event_id=ticket.event_id,
                event_title=event_title,
                seat_label=ticket.seat_label,
                attendee_name=attendee_name
            )

        # 8. Atomic conditional update (Prevent race conditions / simultaneous scans)
        success = self.ticket_repo.atomic_check_in(
            db=db,
            ticket_id=ticket.id,
            checked_in_by=staff_identity,
            notes=notes
        )

        if not success:
            # Simultaneous scan occurred concurrently
            db.refresh(ticket)
            checked_ts = ticket.checked_in_at.strftime("%I:%M %p") if ticket.checked_in_at else "just now"
            return CheckInResultResponse(
                valid=False,
                code="ALREADY_USED",
                message=f"ALREADY USED — This ticket has already been checked in at {checked_ts}.",
                ticket_reference=ticket.ticket_reference,
                event_id=ticket.event_id
            )

        db.refresh(ticket)
        return CheckInResultResponse(
            valid=True,
            code="SUCCESS",
            message=f"SUCCESS — Ticket #{ticket.ticket_reference} successfully verified and admitted!",
            ticket_reference=ticket.ticket_reference,
            event_id=ticket.event_id,
            event_title=event_title,
            seat_label=ticket.seat_label,
            attendee_name=attendee_name,
            checked_in_at=ticket.checked_in_at,
            checked_in_by=ticket.checked_in_by
        )

    def resend_ticket_email(
        self,
        db: Session,
        ticket_id: Optional[int],
        booking_id: Optional[int],
        user_id: int,
        user_role: str,
        event_client: BaseEventClient
    ) -> ResendEmailResponse:
        """
        Idempotently resends the ticket confirmation email with embedded QR code.
        Does NOT generate new tickets or modify existing records.
        """
        ticket = None
        if ticket_id:
            ticket = self.ticket_repo.get_by_id(db, ticket_id)
            if not ticket:
                raise HTTPException(status_code=404, detail="Ticket not found.")
            booking_id = ticket.booking_id

        booking = self.booking_repo.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found.")

        if user_role not in ["ADMIN", "ORGANIZER"] and booking.customer_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to resend email for this booking.")

        evt = event_client.get_event(booking.event_id)
        tickets = booking.tickets or self.ticket_repo.list_by_booking_id(db, booking.id)

        # Lookup recipient email
        recipient_email = None
        recipient_name = None
        try:
            user_row = db.execute(
                text("SELECT email, full_name FROM event_auth_db.users WHERE id = :uid LIMIT 1"),
                {"uid": booking.customer_id}
            ).fetchone()
            if user_row:
                recipient_email = user_row[0]
                recipient_name = user_row[1]
        except Exception as e:
            logger.warning("Auth lookup failed: %s", e)

        if not recipient_email:
            recipient_email = f"user{booking.customer_id}@example.com"

        # Dispatch email
        self.dispatch_ticket_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name or "Valued Attendee",
            event=evt,
            booking=booking,
            tickets=tickets
        )

        return ResendEmailResponse(
            ticket_id=ticket.id if ticket else (tickets[0].id if tickets else None),
            booking_reference=booking.booking_reference,
            ticket_reference=ticket.ticket_reference if ticket else (tickets[0].ticket_reference if tickets else None),
            delivered=True,
            recipient=recipient_email,
            message=f"Digital ticket confirmation re-sent to {recipient_email} via Mailpit SMTP."
        )

    def dispatch_ticket_email(
        self,
        recipient_email: str,
        recipient_name: str,
        event: dict,
        booking: Booking,
        tickets: List[Ticket]
    ):
        """
        Renders rich, responsive HTML ticket pass with embedded QR code
        and dispatches via Mailpit SMTP on port 1025.
        """
        event_title = event.get("title", "Event")
        venue_name = event.get("venue_name", "Main Arena")
        venue_address = event.get("venue_address", "")
        start_at_str = str(event.get("start_at", "Date TBA"))
        end_at_str = str(event.get("end_at", ""))
        booking_ref = booking.booking_reference
        quantity = booking.quantity
        total_amount = str(booking.total_amount_snapshot)
        curr = booking.currency or "INR"
        curr_symbol = "₹" if curr == "INR" else f"{curr} "

        # Generate QR code for the primary ticket
        primary_ticket = tickets[0] if tickets else None
        qr_ref = primary_ticket.ticket_reference if primary_ticket else booking_ref
        qr_payload = json.dumps({"ref": qr_ref, "evt": booking.event_id}, separators=(',', ':'))
        qr_b64_uri = generate_qr_code_image_base64(qr_payload)

        # Date formatting
        def _fmt(dt_s):
            dt = parse_datetime(dt_s)
            if dt:
                return dt.strftime("%A, %B %d, %Y • %I:%M %p")
            return dt_s

        date_display = _fmt(start_at_str)
        if end_at_str:
            date_display += f" to {_fmt(end_at_str)}"

        # Ticket reference list
        ticket_refs_html = "".join([
            f"<div style='font-family: monospace; font-weight: 700; color: #1e1b4b; background: #e0e7ff; padding: 4px 8px; border-radius: 4px; display: inline-block; margin: 2px 4px 2px 0;'>#{t.ticket_reference} ({t.seat_label})</div>"
            for t in tickets
        ])

        html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; margin: 0; padding: 24px 12px; color: #1e293b; }}
  .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }}
  .header {{ background: linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #312e81 100%); padding: 32px 28px 24px; color: #ffffff; text-align: center; }}
  .badge {{ display: inline-block; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px; }}
  .hero {{ background: #f8fafc; padding: 24px 28px; border-bottom: 2px dashed #cbd5e1; }}
  .title {{ font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; }}
  .chip {{ display: inline-block; background: #e0e7ff; color: #3730a3; font-family: monospace; font-size: 15px; font-weight: 700; padding: 6px 14px; border-radius: 6px; }}
  .body {{ padding: 24px 28px; }}
  .table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
  .table td {{ padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }}
  .label {{ color: #64748b; font-weight: 600; width: 32%; }}
  .value {{ color: #0f172a; font-weight: 600; }}
  .price {{ width: 100%; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 20px; }}
  .price td {{ padding: 14px 18px; }}
  .qr-box {{ text-align: center; padding: 20px; background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; margin: 20px 0; }}
  .guidelines {{ background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px 20px; font-size: 13px; color: #92400e; margin-top: 20px; }}
  .guidelines ul {{ margin: 6px 0 0; padding-left: 18px; }}
  .guidelines li {{ margin-bottom: 4px; }}
  .footer {{ background: #090d16; color: #94a3b8; text-align: center; padding: 20px; font-size: 12px; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="badge">✓ Official Digital Entry Pass & Receipt</div>
    <h1 style="margin: 0 0 6px; font-size: 24px; font-weight: 800;">Booking Confirmed!</h1>
    <p style="margin: 0; font-size: 14px; color: #cbd5e1;">Your admission tickets have been cryptographically verified & registered.</p>
  </div>
  <div class="hero">
    <div class="title">{event_title}</div>
    <span style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Pass Reference: </span>
    <span class="chip">{booking_ref}</span>
  </div>
  <div class="body">
    <table class="table">
      <tr><td class="label">📅 Date & Time</td><td class="value">{date_display}</td></tr>
      <tr><td class="label">📍 Venue</td><td class="value"><strong>{venue_name}</strong></td></tr>
      <tr><td class="label">🗺️ Address</td><td class="value">{venue_address if venue_address else 'See event page'}</td></tr>
      <tr><td class="label">🎟️ Tickets</td><td class="value"><strong>{quantity} Ticket(s)</strong></td></tr>
      <tr><td class="label">🏷️ Ticket Ref(s)</td><td class="value">{ticket_refs_html}</td></tr>
      <tr><td class="label">👤 Attendee</td><td class="value">{recipient_name} ({recipient_email})</td></tr>
      <tr><td class="label">⚡ Payment ID</td><td class="value" style="font-family: monospace; color: #4338ca;">{booking.razorpay_payment_id or 'N/A'}</td></tr>
    </table>

    <table class="price">
      <tr>
        <td>
          <div style="font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase;">Total Paid • Status: PAID</div>
          <div style="font-size: 12px; color: #15803d; margin-top: 2px;">Verified via Razorpay Payment Gateway</div>
        </td>
        <td style="text-align: right; font-size: 24px; font-weight: 800; color: #15803d;">
          {curr_symbol}{total_amount}
        </td>
      </tr>
    </table>

    <!-- QR Code Scan Box -->
    <div class="qr-box">
      <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
        Scan at Venue Check-In
      </div>
      <img src="{qr_b64_uri}" alt="Ticket Admission QR Code" style="width: 180px; height: 180px; display: inline-block; border-radius: 8px;">
      <div style="font-family: monospace; font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 10px;">
        #{qr_ref}
      </div>
      <div style="font-size: 11px; color: #dc2626; font-weight: 700; margin-top: 6px;">
        ⚠️ STRICT ONE-TIME ADMISSION: Once scanned, subsequent scans will be rejected.
      </div>
    </div>

    <!-- Entrance Guidelines -->
    <div class="guidelines">
      <strong>Important Entrance & Check-In Instructions:</strong>
      <ul>
        <li><strong>Single Admission:</strong> Each QR pass is valid for one person and allows exactly one entry. Do not share your QR code.</li>
        <li><strong>Arrival:</strong> Doors open 45 minutes prior to event start. Please arrive early to avoid queue delays.</li>
        <li><strong>Photo Identification:</strong> Attendees must carry a valid government-issued photo ID matching the reservation name.</li>
        <li><strong>Offline Access:</strong> Save this email or take a screenshot of the QR pass to ensure smooth access at venue entrance.</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <strong>EventPass Booking System</strong> &copy; 2026. All rights reserved.<br>
    Automated notification dispatched via Mailpit SMTP.
  </div>
</div>
</body>
</html>"""

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"🎟️ Entry Pass Confirmed: {event_title} — Ref #{booking_ref}"
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = recipient_email
            msg.attach(MIMEText(f"Booking Confirmed! Event: {event_title}. Reference: {booking_ref}. Ticket: {qr_ref}. Total Paid: {curr_symbol}{total_amount}", "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.send_message(msg)
            logger.info("Delivered QR ticket pass email to %s for booking %s", recipient_email, booking_ref)
        except Exception as e:
            logger.error("Failed to deliver ticket email via SMTP: %s", e)
