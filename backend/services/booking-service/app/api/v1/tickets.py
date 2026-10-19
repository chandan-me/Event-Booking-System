from typing import Optional, List
from fastapi import APIRouter, Depends, status, Query, Header, HTTPException
from sqlalchemy.orm import Session

from app.schemas.booking import StandardResponse, PaginatedResponse
from app.schemas.ticket import (
    TicketResponse, CheckInVerifyRequest, CheckInScanRequest,
    CheckInResultResponse, CheckInStatsResponse, ResendEmailResponse,
    PublicVerifyResponse
)
from app.api.deps import (
    get_db, get_event_client, get_ticket_service,
    get_current_user_payload, require_admin, require_organizer_or_admin
)
from app.services.ticket_service import TicketService
from app.clients.event_client import BaseEventClient

router = APIRouter(prefix="/api/v1", tags=["Tickets & Secure QR Check-in"])


# ============================================================================
# ATTENDEE TICKET PORTAL ENDPOINTS
# ============================================================================

@router.get(
    "/tickets/my-tickets",
    response_model=StandardResponse[PaginatedResponse[TicketResponse]],
    summary="Get current user's cryptographic QR tickets (Attendee)"
)
@router.get(
    "/tickets/me",
    response_model=StandardResponse[PaginatedResponse[TicketResponse]],
    summary="Get current user's cryptographic QR tickets (Attendee)"
)
def get_my_tickets(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    event_client: BaseEventClient = Depends(get_event_client),
    user_payload: dict = Depends(get_current_user_payload)
):
    customer_id = int(user_payload.get("sub", 0))
    tickets, total = ticket_service.get_my_tickets(
        db=db,
        customer_id=customer_id,
        event_client=event_client,
        page=page,
        page_size=page_size
    )
    import math
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    paginated = PaginatedResponse(
        items=tickets,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
    return StandardResponse(
        success=True,
        data=paginated,
        message="Active tickets and QR credentials retrieved successfully"
    )


@router.get(
    "/tickets/{ticket_id}",
    response_model=StandardResponse[TicketResponse],
    summary="Get single ticket details with QR code by numeric ticket ID"
)
def get_ticket_details(
    ticket_id: int,
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    event_client: BaseEventClient = Depends(get_event_client),
    user_payload: dict = Depends(get_current_user_payload)
):
    user_id = int(user_payload.get("sub", 0))
    user_role = user_payload.get("role", "CUSTOMER")
    ticket = ticket_service.get_ticket_by_id(
        db=db,
        ticket_id=ticket_id,
        user_id=user_id,
        user_role=user_role,
        event_client=event_client
    )
    return StandardResponse(
        success=True,
        data=ticket,
        message="Ticket details and verification pass loaded successfully"
    )


@router.get(
    "/tickets/ref/{ticket_reference}",
    response_model=StandardResponse[TicketResponse],
    summary="Get ticket details by ticket reference"
)
def get_ticket_by_reference(
    ticket_reference: str,
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    event_client: BaseEventClient = Depends(get_event_client),
    user_payload: dict = Depends(get_current_user_payload)
):
    ticket = ticket_service.ticket_repo.get_by_reference(db, ticket_reference)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket reference not found")

    user_id = int(user_payload.get("sub", 0))
    user_role = user_payload.get("role", "CUSTOMER")
    evt = event_client.get_event(ticket.event_id)
    if user_role not in ["ADMIN"]:
        if user_role in ["ORGANIZER", "ORGANISER"]:
            if evt and evt.get("created_by") is not None and evt.get("created_by") != user_id and ticket.customer_id != user_id:
                raise HTTPException(status_code=403, detail="Permission denied for this ticket")
        elif ticket.customer_id != user_id:
            raise HTTPException(status_code=403, detail="Permission denied for this ticket")

    enriched = ticket_service.enrich_ticket_response(ticket, event=evt)
    return StandardResponse(
        success=True,
        data=enriched,
        message="Ticket loaded successfully"
    )


@router.get(
    "/tickets/public-verify/{ticket_reference}",
    response_model=StandardResponse[PublicVerifyResponse],
    summary="Public ticket validity check (Minimal, no private data exposed)"
)
def public_verify_ticket(
    ticket_reference: str,
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    event_client: BaseEventClient = Depends(get_event_client)
):
    result = ticket_service.public_verify(db, ticket_reference, event_client)
    return StandardResponse(
        success=True,
        data=result,
        message="Public ticket status retrieved"
    )


# ============================================================================
# EMAIL RESEND ENDPOINTS
# ============================================================================

@router.post(
    "/tickets/{ticket_id}/resend-email",
    response_model=StandardResponse[ResendEmailResponse],
    summary="Safely resend QR ticket confirmation email for a ticket"
)
def resend_ticket_email(
    ticket_id: int,
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    event_client: BaseEventClient = Depends(get_event_client),
    user_payload: dict = Depends(get_current_user_payload)
):
    user_id = int(user_payload.get("sub", 0))
    user_role = user_payload.get("role", "CUSTOMER")
    res = ticket_service.resend_ticket_email(
        db=db,
        ticket_id=ticket_id,
        booking_id=None,
        user_id=user_id,
        user_role=user_role,
        event_client=event_client
    )
    return StandardResponse(
        success=True,
        data=res,
        message="Confirmation email with digital pass re-sent successfully"
    )


@router.post(
    "/bookings/{booking_id}/resend-email",
    response_model=StandardResponse[ResendEmailResponse],
    summary="Safely resend confirmation email for an entire booking"
)
def resend_booking_email(
    booking_id: int,
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    event_client: BaseEventClient = Depends(get_event_client),
    user_payload: dict = Depends(get_current_user_payload)
):
    user_id = int(user_payload.get("sub", 0))
    user_role = user_payload.get("role", "CUSTOMER")
    res = ticket_service.resend_ticket_email(
        db=db,
        ticket_id=None,
        booking_id=booking_id,
        user_id=user_id,
        user_role=user_role,
        event_client=event_client
    )
    return StandardResponse(
        success=True,
        data=res,
        message="Booking confirmation email re-dispatched successfully"
    )


# ============================================================================
# CHECK-IN & SCANNER VERIFICATION (ORGANIZERS & STAFF)
# ============================================================================

@router.post(
    "/check-in/verify",
    response_model=StandardResponse[CheckInResultResponse],
    summary="Verify QR code or reference without checking in (Authorized Staff)"
)
def verify_ticket_admission(
    req: CheckInVerifyRequest,
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    event_client: BaseEventClient = Depends(get_event_client),
    staff_payload: dict = Depends(require_organizer_or_admin)
):
    staff_name = staff_payload.get("name") or staff_payload.get("email") or f"Staff #{staff_payload.get('sub')}"
    result = ticket_service.verify_or_scan_ticket(
        db=db,
        event_client=event_client,
        ticket_ref=req.ticket_reference,
        token=req.token,
        qr_payload=req.qr_payload,
        expected_event_id=req.event_id,
        staff_identity=staff_name,
        is_scan_action=False
    )
    return StandardResponse(
        success=result.valid,
        data=result,
        message=result.message
    )


@router.post(
    "/check-in/scan",
    response_model=StandardResponse[CheckInResultResponse],
    summary="Atomically scan and check in an attendee via camera QR or manual ref (Authorized Staff)"
)
def scan_and_check_in_ticket(
    req: CheckInScanRequest,
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    event_client: BaseEventClient = Depends(get_event_client),
    staff_payload: dict = Depends(require_organizer_or_admin)
):
    staff_name = req.staff_name or staff_payload.get("name") or staff_payload.get("email") or f"Staff #{staff_payload.get('sub')}"
    result = ticket_service.verify_or_scan_ticket(
        db=db,
        event_client=event_client,
        ticket_ref=req.ticket_reference,
        token=req.token,
        qr_payload=req.qr_payload,
        expected_event_id=req.event_id,
        staff_identity=staff_name,
        is_scan_action=True,
        notes=req.notes
    )
    return StandardResponse(
        success=result.valid,
        data=result,
        message=result.message
    )


# Compatible endpoint for existing frontend OrganizerDashboardPage.jsx
@router.post(
    "/organizer/check-in",
    response_model=StandardResponse[dict],
    summary="Check in an attendee via ticket reference or QR payload (Backward Compatible)"
)
def organizer_check_in_compat(
    payload: dict,
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    event_client: BaseEventClient = Depends(get_event_client),
    staff_payload: dict = Depends(require_organizer_or_admin)
):
    ref = payload.get("booking_reference") or payload.get("ticket_reference") or payload.get("qr_payload")
    event_id = payload.get("event_id")
    if not ref:
        raise HTTPException(status_code=400, detail="Ticket reference or booking reference is required")

    staff_name = staff_payload.get("name") or staff_payload.get("email") or f"Staff #{staff_payload.get('sub')}"
    result = ticket_service.verify_or_scan_ticket(
        db=db,
        event_client=event_client,
        ticket_ref=ref,
        token=payload.get("token"),
        qr_payload=payload.get("qr_payload") if payload.get("qr_payload") else (ref if "{" in ref else None),
        expected_event_id=event_id,
        staff_identity=staff_name,
        is_scan_action=True
    )
    if not result.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )

    return StandardResponse(
        success=True,
        data={
            "ticket_reference": result.ticket_reference,
            "checked_in": True,
            "attendee_name": result.attendee_name,
            "event_title": result.event_title,
            "checked_in_at": result.checked_in_at.isoformat() if result.checked_in_at else None,
            "checked_in_by": result.checked_in_by
        },
        message=result.message
    )


@router.get(
    "/events/{event_id}/check-in-stats",
    response_model=StandardResponse[CheckInStatsResponse],
    summary="Get real-time check-in stats for an event (Authorized Staff)"
)
@router.get(
    "/organizer/events/{event_id}/check-in-stats",
    response_model=StandardResponse[CheckInStatsResponse],
    summary="Get real-time check-in stats for an event (Authorized Staff)"
)
def get_event_check_in_stats(
    event_id: int,
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    event_client: BaseEventClient = Depends(get_event_client),
    staff_payload: dict = Depends(require_organizer_or_admin)
):
    user_id = int(staff_payload.get("sub", 0))
    user_role = staff_payload.get("role", "CUSTOMER")
    if user_role not in ["ADMIN"]:
        try:
            event = event_client.get_event(event_id)
            if event and event.get("created_by") is not None and event.get("created_by") != user_id:
                raise HTTPException(status_code=403, detail="Permission denied for this event.")
        except HTTPException:
            raise
        except Exception:
            pass

    stats = ticket_service.ticket_repo.get_event_check_in_stats(db, event_id)
    return StandardResponse(
        success=True,
        data=CheckInStatsResponse(**stats),
        message="Live check-in metrics retrieved successfully"
    )


# ============================================================================
# LIFECYCLE, EXPIRY & CLEANUP BACKGROUND ENDPOINTS
# ============================================================================

@router.post(
    "/tickets/expire-completed",
    response_model=StandardResponse[dict],
    summary="Trigger automatic ticket expiry for events that have finished (Admin/Cron)"
)
def expire_completed_events(
    event_id: Optional[int] = Query(None, description="Specific event ID to expire, or all"),
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    event_client: BaseEventClient = Depends(get_event_client),
    admin_payload: dict = Depends(require_admin)
):
    count = 0
    if event_id:
        count = ticket_service.ticket_repo.expire_tickets_for_event(db, event_id)
    return StandardResponse(
        success=True,
        data={"expired_tickets_count": count},
        message=f"Expired {count} tickets for completed event(s)"
    )


@router.post(
    "/tickets/cleanup-retention",
    response_model=StandardResponse[dict],
    summary="Anonymize secret tokens for old tickets past retention period (Admin/Cron)"
)
def cleanup_retention(
    days: int = Query(30, ge=1, le=365, description="Retention threshold in days"),
    db: Session = Depends(get_db),
    ticket_service: TicketService = Depends(get_ticket_service),
    admin_payload: dict = Depends(require_admin)
):
    cleared = ticket_service.ticket_repo.cleanup_anonymize_expired_tickets(db, days_retention=days)
    return StandardResponse(
        success=True,
        data={"anonymized_tickets_count": cleared, "retention_days": days},
        message=f"Safely anonymized secret credentials for {cleared} tickets beyond {days} days retention."
    )
