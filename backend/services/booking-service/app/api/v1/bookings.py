from typing import Optional, List
from fastapi import APIRouter, Depends, status, Query, Header, HTTPException
from sqlalchemy.orm import Session

from app.schemas.booking import (
    BookingCreateRequest, BookingCancelRequest, BookingResponse,
    BookingDetailResponse, PaginatedResponse, StandardResponse,
    RazorpayOrderCreateRequest, RazorpayOrderResponse, RazorpayVerifyRequest,
    AttendeeItemResponse, OrganizerAnalyticsResponse,
    WaitingListCreateRequest, WaitingListResponse, WaitingListStatusUpdateRequest
)
from app.api.deps import (
    get_db, get_event_client, get_booking_service,
    get_current_user_payload, require_admin, require_organizer_or_admin,
    get_optional_user_payload
)
from app.services.booking_service import BookingService
from app.clients.event_client import BaseEventClient

router = APIRouter(prefix="/api/v1", tags=["Bookings"])


@router.post(
    "/bookings/razorpay/order",
    response_model=StandardResponse[RazorpayOrderResponse],
    summary="Create a Razorpay payment order for ticket reservation (Customer)"
)
def create_razorpay_order(
    req: RazorpayOrderCreateRequest,
    db: Session = Depends(get_db),
    event_client: BaseEventClient = Depends(get_event_client),
    booking_service: BookingService = Depends(get_booking_service),
    user_payload: dict = Depends(get_current_user_payload)
):
    customer_id = int(user_payload.get("sub", 0))
    customer_email = req.customer_email or user_payload.get("email")
    order = booking_service.create_razorpay_order(
        event_client=event_client,
        customer_id=customer_id,
        req=req,
        db=db,
        customer_email=customer_email
    )
    return StandardResponse(
        success=True,
        data=order,
        message="Razorpay order generated successfully"
    )


@router.post(
    "/bookings/razorpay/verify",
    response_model=StandardResponse[dict],
    summary="Verify Razorpay payment signature (Customer)"
)
def verify_razorpay_payment(
    req: RazorpayVerifyRequest,
    booking_service: BookingService = Depends(get_booking_service),
    user_payload: dict = Depends(get_current_user_payload)
):
    is_valid = booking_service.verify_razorpay_signature(
        razorpay_order_id=req.razorpay_order_id,
        razorpay_payment_id=req.razorpay_payment_id,
        razorpay_signature=req.razorpay_signature
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Razorpay payment signature."
        )
    return StandardResponse(
        success=True,
        data={"verified": True, "order_id": req.razorpay_order_id, "payment_id": req.razorpay_payment_id},
        message="Razorpay payment verified successfully"
    )


@router.post(
    "/bookings",
    response_model=StandardResponse[BookingResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new ticket booking (Customer)"
)
def create_booking(
    req: BookingCreateRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    event_client: BaseEventClient = Depends(get_event_client),
    booking_service: BookingService = Depends(get_booking_service),
    user_payload: dict = Depends(get_current_user_payload)
):
    if idempotency_key and not req.idempotency_key:
        req.idempotency_key = idempotency_key

    customer_id = int(user_payload.get("sub", 0))
    customer_email = req.customer_email or user_payload.get("email")
    customer_name = req.customer_name or user_payload.get("name") or user_payload.get("full_name")

    booking = booking_service.create_booking(
        db=db,
        event_client=event_client,
        customer_id=customer_id,
        req=req,
        customer_email=customer_email,
        customer_name=customer_name
    )
    return StandardResponse(
        success=True,
        data=booking,
        message="Booking successfully created and confirmed"
    )


@router.get(
    "/bookings",
    response_model=StandardResponse[PaginatedResponse[BookingResponse]],
    summary="View customer's own booking history (Customer)"
)
@router.get(
    "/bookings/me",
    response_model=StandardResponse[PaginatedResponse[BookingResponse]],
    summary="View customer's own booking history (Customer)"
)
def get_my_bookings(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Items per page"),
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    user_payload: dict = Depends(get_current_user_payload)
):
    customer_id = int(user_payload.get("sub", 0))
    bookings = booking_service.list_my_bookings(
        db=db,
        customer_id=customer_id,
        page=page,
        page_size=page_size
    )
    return StandardResponse(
        success=True,
        data=bookings,
        message="Booking history retrieved successfully"
    )


@router.get(
    "/bookings/{booking_id}",
    response_model=StandardResponse[BookingDetailResponse],
    summary="Get single booking details with status audit trail (Customer/Admin)"
)
def get_booking_details(
    booking_id: int,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    user_payload: dict = Depends(get_current_user_payload)
):
    user_id = int(user_payload.get("sub", 0))
    user_role = user_payload.get("role", "CUSTOMER")

    booking = booking_service.get_booking_details(
        db=db,
        user_id=user_id,
        user_role=user_role,
        booking_id=booking_id
    )
    return StandardResponse(
        success=True,
        data=booking,
        message="Booking details retrieved successfully"
    )


@router.post(
    "/bookings/{booking_id}/cancel",
    response_model=StandardResponse[BookingResponse],
    summary="Cancel an existing booking and release ticket inventory (Customer/Admin)"
)
def cancel_booking(
    booking_id: int,
    req: BookingCancelRequest | None = None,
    db: Session = Depends(get_db),
    event_client: BaseEventClient = Depends(get_event_client),
    booking_service: BookingService = Depends(get_booking_service),
    user_payload: dict = Depends(get_current_user_payload)
):
    user_id = int(user_payload.get("sub", 0))
    user_role = user_payload.get("role", "CUSTOMER")
    reason = req.reason if req else None

    cancelled = booking_service.cancel_booking(
        db=db,
        event_client=event_client,
        user_id=user_id,
        user_role=user_role,
        booking_id=booking_id,
        reason=reason
    )
    return StandardResponse(
        success=True,
        data=cancelled,
        message="Booking cancelled successfully and ticket capacity restored"
    )


@router.get(
    "/admin/bookings",
    response_model=StandardResponse[PaginatedResponse[BookingResponse]],
    summary="List all bookings with filters (Admin only)"
)
def list_admin_bookings(
    status: Optional[str] = Query(None, description="Filter by status (CONFIRMED, CANCELLED, PENDING, FAILED)"),
    event_id: Optional[int] = Query(None, description="Filter by event ID"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    admin_payload: dict = Depends(require_admin)
):
    bookings = booking_service.list_all_admin_bookings(
        db=db,
        status=status,
        event_id=event_id,
        customer_id=customer_id,
        page=page,
        page_size=page_size
    )
    return StandardResponse(
        success=True,
        data=bookings,
        message="All bookings retrieved successfully"
    )


# --- Organizer Specific Endpoints ---
@router.get(
    "/organizer/events/{event_id}/attendees",
    response_model=StandardResponse[List[AttendeeItemResponse]],
    summary="Get attendee roster and QR verification codes for an event"
)
def get_event_attendees(
    event_id: int,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    event_client: BaseEventClient = Depends(get_event_client),
    organizer_payload: dict = Depends(require_organizer_or_admin)
):
    user_id = int(organizer_payload.get("sub", 0))
    user_role = organizer_payload.get("role", "CUSTOMER")
    if user_role not in ["ADMIN"]:
        try:
            event = event_client.get_event(event_id)
            if event and event.get("created_by") is not None and event.get("created_by") != user_id:
                raise HTTPException(status_code=403, detail="You do not have permission to view attendees for this event.")
        except HTTPException:
            raise
        except Exception:
            pass

    attendees = booking_service.list_attendees_for_event(db=db, event_id=event_id)
    return StandardResponse(
        success=True,
        data=attendees,
        message="Attendee roster retrieved successfully"
    )


@router.get(
    "/organizer/analytics",
    response_model=StandardResponse[OrganizerAnalyticsResponse],
    summary="Get aggregated booking, revenue, email, and QR analytics"
)
def get_organizer_metrics(
    event_ids: str = Query("", description="Comma-separated event IDs"),
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    event_client: BaseEventClient = Depends(get_event_client),
    organizer_payload: dict = Depends(require_organizer_or_admin)
):
    user_id = int(organizer_payload.get("sub", 0))
    user_role = organizer_payload.get("role", "CUSTOMER")
    ids = []
    if event_ids:
        for val in event_ids.split(","):
            val = val.strip()
            if val.isdigit():
                ids.append(int(val))

    if ids:
        if user_role not in ["ADMIN"]:
            verified_ids = []
            for eid in ids:
                try:
                    event = event_client.get_event(eid)
                    if event and (event.get("created_by") == user_id or event.get("organizer_id") == user_id):
                        verified_ids.append(eid)
                except Exception:
                    pass
            ids = verified_ids
    else:
        if user_role in ["ADMIN"]:
            ids = None  # Admin gets system-wide aggregates
        else:
            try:
                ids = event_client.get_organizer_event_ids(user_id)
            except Exception:
                ids = []

    analytics = booking_service.get_organizer_analytics(db=db, event_ids=ids)
    return StandardResponse(
        success=True,
        data=analytics,
        message="Organizer metrics retrieved successfully"
    )


@router.post(
    "/organizer/check-in",
    response_model=StandardResponse[dict],
    summary="Check in an attendee via ticket reference or QR code"
)
def check_in_attendee(
    payload: dict,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    event_client: BaseEventClient = Depends(get_event_client),
    organizer_payload: dict = Depends(require_organizer_or_admin)
):
    ref = payload.get("booking_reference")
    if not ref:
        raise HTTPException(status_code=400, detail="booking_reference is required")
    booking = booking_service.booking_repo.get_by_reference(db, ref)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking ticket reference not found")

    user_id = int(organizer_payload.get("sub", 0))
    user_role = organizer_payload.get("role", "CUSTOMER")
    if user_role not in ["ADMIN"]:
        try:
            event = event_client.get_event(booking.event_id)
            if event and event.get("created_by") is not None and event.get("created_by") != user_id:
                raise HTTPException(status_code=403, detail="You do not own the event associated with this ticket.")
        except HTTPException:
            raise
        except Exception:
            pass

    return StandardResponse(
        success=True,
        data={"booking_reference": ref, "checked_in": True, "attendee_id": booking.customer_id},
        message=f"Attendee with ticket {ref} successfully checked in!"
    )


# --- Waiting List Endpoints ---
@router.post(
    "/waiting-list",
    response_model=StandardResponse[WaitingListResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Join the waiting list for an event (Customer)"
)
def join_event_waiting_list(
    req: WaitingListCreateRequest,
    db: Session = Depends(get_db),
    event_client: BaseEventClient = Depends(get_event_client),
    booking_service: BookingService = Depends(get_booking_service),
    user_payload: Optional[dict] = Depends(get_optional_user_payload)
):
    customer_id = int(user_payload.get("sub", 0)) if user_payload else 0
    email = req.customer_email or (user_payload.get("email") if user_payload else None)
    name = req.customer_name or (user_payload.get("name") or user_payload.get("full_name") if user_payload else None)
    entry = booking_service.join_waiting_list(
        db=db,
        event_client=event_client,
        customer_id=customer_id,
        req=req,
        customer_email=email,
        customer_name=name
    )
    return StandardResponse(
        success=True,
        data=entry,
        message=f"Joined waiting list successfully! Your queue position is #{entry.queue_position}."
    )


@router.get(
    "/waiting-list/me",
    response_model=StandardResponse[List[WaitingListResponse]],
    summary="View customer's waiting list reservations"
)
def get_my_waiting_list(
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    user_payload: dict = Depends(get_current_user_payload)
):
    customer_id = int(user_payload.get("sub", 0))
    email = user_payload.get("email")
    entries = booking_service.list_my_waiting_list(db, customer_id, email=email)
    return StandardResponse(
        success=True,
        data=entries,
        message="My waiting list entries retrieved"
    )


@router.get(
    "/organizer/events/{event_id}/waiting-list",
    response_model=StandardResponse[List[WaitingListResponse]],
    summary="Get waiting list entries for an event (Organizer/Admin)"
)
def get_event_waiting_list(
    event_id: int,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    organizer_payload: dict = Depends(require_organizer_or_admin)
):
    entries = booking_service.list_event_waiting_list(db=db, event_id=event_id)
    return StandardResponse(
        success=True,
        data=entries,
        message="Event waiting list retrieved successfully"
    )


@router.get(
    "/organizer/waiting-list",
    response_model=StandardResponse[PaginatedResponse[WaitingListResponse]],
    summary="List all waiting list requests across organizer hosted events"
)
def get_organizer_all_waiting_list(
    event_ids: str = Query("", description="Comma-separated event IDs"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    organizer_payload: dict = Depends(require_organizer_or_admin)
):
    ids = [int(v.strip()) for v in event_ids.split(",") if v.strip().isdigit()]
    res = booking_service.list_all_waiting_list(db=db, event_ids=ids if ids else None, page=page, page_size=page_size)
    return StandardResponse(
        success=True,
        data=res,
        message="Organizer waiting list entries retrieved"
    )


@router.get(
    "/admin/waiting-list",
    response_model=StandardResponse[PaginatedResponse[WaitingListResponse]],
    summary="List all waiting list requests across platform (Admin)"
)
def get_admin_waiting_list(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    admin_payload: dict = Depends(require_admin)
):
    res = booking_service.list_all_waiting_list(db=db, status=status, page=page, page_size=page_size)
    return StandardResponse(
        success=True,
        data=res,
        message="Platform waiting list entries retrieved"
    )


@router.patch(
    "/waiting-list/{entry_id}/status",
    response_model=StandardResponse[WaitingListResponse],
    summary="Update waiting list entry status (NOTIFIED, CONVERTED, CANCELLED)"
)
def update_waiting_list_status(
    entry_id: int,
    req: WaitingListStatusUpdateRequest,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    organizer_payload: dict = Depends(require_organizer_or_admin)
):
    updated = booking_service.update_waiting_list_status(db, entry_id, req.status)
    return StandardResponse(
        success=True,
        data=updated,
        message=f"Waiting list entry updated to {req.status}"
    )


