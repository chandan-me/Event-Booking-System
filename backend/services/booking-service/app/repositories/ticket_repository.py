import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func, update, text, or_
from app.models.ticket import Ticket
from app.models.booking import Booking


def generate_ticket_reference(event_id: int, booking_id: int, seq: int) -> str:
    """Generate human-readable unique ticket reference code: TKT-YYYYMMDD-XXXXXX."""
    now_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    rnd = secrets.token_hex(3).upper()
    return f"TKT-{now_str}-{rnd}-{seq}"


def generate_secure_token() -> Tuple[str, str]:
    """Generates a raw secret token and its SHA-256 hash."""
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return raw_token, token_hash


class TicketRepository:
    def get_by_id(self, db: Session, ticket_id: int) -> Optional[Ticket]:
        return db.execute(select(Ticket).where(Ticket.id == ticket_id)).scalar_one_or_none()

    def get_by_reference(self, db: Session, ticket_reference: str) -> Optional[Ticket]:
        return db.execute(select(Ticket).where(Ticket.ticket_reference == ticket_reference)).scalar_one_or_none()

    def get_by_token_hash(self, db: Session, token_hash: str) -> Optional[Ticket]:
        return db.execute(select(Ticket).where(Ticket.token_hash == token_hash)).scalar_one_or_none()

    def list_by_booking_id(self, db: Session, booking_id: int) -> List[Ticket]:
        query = select(Ticket).where(Ticket.booking_id == booking_id).order_by(Ticket.id.asc())
        return list(db.execute(query).scalars().all())

    def list_by_customer(
        self,
        db: Session,
        customer_id: int,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Ticket], int]:
        query = select(Ticket).where(Ticket.customer_id == customer_id)
        count_query = select(func.count()).select_from(query.subquery())
        total = db.execute(count_query).scalar_one()

        offset = (page - 1) * page_size
        tickets = list(
            db.execute(
                query.order_by(Ticket.created_at.desc())
                .offset(offset)
                .limit(page_size)
            ).scalars().all()
        )
        return tickets, total

    def list_by_event(
        self,
        db: Session,
        event_id: int,
        status: Optional[str] = None
    ) -> List[Ticket]:
        query = select(Ticket).where(Ticket.event_id == event_id)
        if status:
            query = query.where(Ticket.status == status)
        query = query.order_by(Ticket.created_at.desc())
        return list(db.execute(query).scalars().all())

    def create_tickets_for_booking(
        self,
        db: Session,
        booking: Booking,
        expires_at: Optional[datetime] = None,
        seat_tier: str = "General Admission"
    ) -> List[Tuple[Ticket, str]]:
        """
        Generates individual tickets for every unit in the booking.
        Returns list of (Ticket, raw_secret_token) tuples.
        """
        results = []
        now = datetime.now(timezone.utc)
        for i in range(1, booking.quantity + 1):
            raw_token, token_hash = generate_secure_token()
            ticket_ref = generate_ticket_reference(booking.event_id, booking.id, i)

            label = f"{seat_tier} #{i}" if booking.quantity > 1 else seat_tier

            ticket = Ticket(
                booking_id=booking.id,
                event_id=booking.event_id,
                customer_id=booking.customer_id,
                ticket_reference=ticket_ref,
                token_hash=token_hash,
                seat_label=label,
                status="ACTIVE",
                issued_at=now,
                expires_at=expires_at,
                created_at=now,
                updated_at=now
            )
            db.add(ticket)
            results.append((ticket, raw_token))

        db.commit()
        for t, _ in results:
            db.refresh(t)

        return results

    def atomic_check_in(
        self,
        db: Session,
        ticket_id: int,
        checked_in_by: str,
        notes: Optional[str] = None
    ) -> bool:
        """
        Atomically transitions ticket status from ACTIVE to CHECKED_IN.
        Guarantees concurrency safety against race condition duplicate scans.
        Returns True if transition succeeded, False if already used or inactive.
        """
        now = datetime.now(timezone.utc)
        stmt = (
            update(Ticket)
            .where(Ticket.id == ticket_id)
            .where(Ticket.status == "ACTIVE")
            .values(
                status="CHECKED_IN",
                checked_in_at=now,
                checked_in_by=checked_in_by,
                check_in_notes=notes,
                updated_at=now
            )
        )
        res = db.execute(stmt)
        db.commit()
        return res.rowcount > 0

    def cancel_tickets_for_booking(self, db: Session, booking_id: int) -> int:
        """Cancels all active tickets when a booking is cancelled."""
        now = datetime.now(timezone.utc)
        stmt = (
            update(Ticket)
            .where(Ticket.booking_id == booking_id)
            .where(Ticket.status == "ACTIVE")
            .values(
                status="CANCELLED",
                revoked_at=now,
                updated_at=now
            )
        )
        res = db.execute(stmt)
        db.commit()
        return res.rowcount

    def expire_tickets_for_event(self, db: Session, event_id: int) -> int:
        """Marks all active tickets for a completed event as EXPIRED."""
        now = datetime.now(timezone.utc)
        stmt = (
            update(Ticket)
            .where(Ticket.event_id == event_id)
            .where(Ticket.status == "ACTIVE")
            .values(
                status="EXPIRED",
                updated_at=now
            )
        )
        res = db.execute(stmt)
        db.commit()
        return res.rowcount

    def cleanup_anonymize_expired_tickets(self, db: Session, days_retention: int = 30) -> int:
        """
        Secure cleanup: Anonymizes / nullifies ticket secrets (token_hash)
        for tickets belonging to events ended more than `days_retention` days ago.
        Preserves ticket row, booking ID, and audit timestamps for legal/accounting records.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_retention)
        stmt = (
            update(Ticket)
            .where(Ticket.status.in_(["EXPIRED", "CHECKED_IN"]))
            .where(or_(Ticket.created_at < cutoff, Ticket.expires_at < cutoff))
            .where(Ticket.token_hash != "ANONYMIZED_CLEARED")
            .values(
                token_hash="ANONYMIZED_CLEARED",
                check_in_notes="Audit retained; secret token cleared per retention policy.",
                updated_at=datetime.now(timezone.utc)
            )
        )
        res = db.execute(stmt)
        db.commit()
        return res.rowcount

    def get_event_check_in_stats(self, db: Session, event_id: int) -> Dict[str, Any]:
        """Calculates live check-in statistics for an event."""
        res = db.execute(
            select(Ticket.status, func.count(Ticket.id))
            .where(Ticket.event_id == event_id)
            .group_by(Ticket.status)
        ).all()

        counts = {r[0]: r[1] for r in res}
        total = sum(counts.values())
        checked_in = counts.get("CHECKED_IN", 0)
        active = counts.get("ACTIVE", 0)
        cancelled = counts.get("CANCELLED", 0)
        expired = counts.get("EXPIRED", 0)
        revoked = counts.get("REVOKED", 0)

        remaining = active
        check_in_rate = round((checked_in / total * 100), 1) if total > 0 else 0.0

        return {
            "event_id": event_id,
            "total_tickets": total,
            "checked_in_count": checked_in,
            "remaining_count": remaining,
            "cancelled_count": cancelled,
            "expired_count": expired,
            "revoked_count": revoked,
            "check_in_rate_percentage": check_in_rate,
            "check_in_rate_percent": check_in_rate,
        }
