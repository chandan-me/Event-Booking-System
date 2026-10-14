from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.schemas.booking import (
    BookingCreateRequest, BookingCancelRequest, BookingResponse,
    BookingDetailResponse, PaginatedResponse, StandardResponse
)
from app.api.deps import (
    get_db, get_event_client, get_booking_service,
    get_current_user_payload, require_admin
)
from app.services.booking_service import BookingService
from app.clients.event_client import BaseEventClient

router = APIRouter(prefix="/api/v1", tags=["Bookings"])


@router.post(
    "/bookings",
    response_model=StandardResponse[BookingResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new ticket booking (Customer)"
)
def create_booking(
    req: BookingCreateRequest,
    db: Session = Depends(get_db),
    event_client: BaseEventClient = Depends(get_event_client),
    booking_service: BookingService = Depends(get_booking_service),
    user_payload: dict = Depends(get_current_user_payload)
):
    customer_id = int(user_payload.get("sub", 0))
    booking = booking_service.create_booking(
        db=db,
        event_client=event_client,
        customer_id=customer_id,
        req=req
    )
    return StandardResponse(
        success=True,
        data=booking,
        message="Booking successfully created and confirmed"
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
