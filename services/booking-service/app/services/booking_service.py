import math
import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.booking_repository import BookingRepository
from app.clients.event_client import BaseEventClient
from app.schemas.booking import (
    BookingCreateRequest, BookingResponse, BookingDetailResponse,
    BookingStatusHistoryResponse, PaginatedResponse
)
from app.models.booking import Booking


def generate_booking_reference() -> str:
    """Generate human-readable booking reference code: BK-YYYYMMDD-XXXXXX."""
    now_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_suffix = secrets.token_hex(3).upper()
    return f"BK-{now_str}-{random_suffix}"


class BookingService:
    def __init__(self, booking_repo: Optional[BookingRepository] = None):
        self.booking_repo = booking_repo or BookingRepository()

    def create_booking(
        self,
        db: Session,
        event_client: BaseEventClient,
        customer_id: int,
        req: BookingCreateRequest
    ) -> BookingResponse:
        idempotency_key = req.idempotency_key or f"idem-{uuid.uuid4().hex}"

        # 1. Idempotency Check
        existing_booking = self.booking_repo.get_by_idempotency_key(db, idempotency_key)
        if existing_booking:
            # Idempotency hit: return existing booking without duplicating inventory reservation
            return BookingResponse.model_validate(existing_booking)

        # 2. Get authoritative event details from Event Service
        event = event_client.get_event(req.event_id)
        if event.get("status") != "PUBLISHED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tickets can only be booked for published events."
            )

        unit_price = Decimal(str(event.get("price", "0.00")))
        currency = event.get("currency", "INR")
        total_amount = unit_price * req.quantity
        booking_ref = generate_booking_reference()

        # 3. Synchronous Atomic Reservation in Event Service
        # Raises HTTP 409 Conflict if tickets are unavailable
        event_client.reserve_tickets(
            event_id=req.event_id,
            quantity=req.quantity,
            reservation_id=booking_ref
        )

        # 4. Finalize Booking in Booking Service Database with Compensation Safety
        try:
            booking_data = {
                "booking_reference": booking_ref,
                "customer_id": customer_id,
                "event_id": req.event_id,
                "quantity": req.quantity,
                "unit_price_snapshot": unit_price,
                "total_amount_snapshot": total_amount,
                "currency": currency,
                "status": "CONFIRMED",
                "idempotency_key": idempotency_key
            }
            booking = self.booking_repo.create_booking(db, booking_data)
            return BookingResponse.model_validate(booking)
        except Exception as e:
            # Failure recovery: Compensating transaction release in Event Service
            event_client.release_tickets(
                event_id=req.event_id,
                quantity=req.quantity,
                reservation_id=booking_ref
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Booking confirmation failed. Reserved inventory has been safely restored."
            ) from e

    def get_booking_details(
        self,
        db: Session,
        user_id: int,
        user_role: str,
        booking_id: int
    ) -> BookingDetailResponse:
        booking = self.booking_repo.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

        # Ownership validation: customers can only view their own bookings
        if user_role != "ADMIN" and booking.customer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this booking."
            )

        resp = BookingDetailResponse.model_validate(booking)
        if booking.status_history:
            resp.status_history = [
                BookingStatusHistoryResponse.model_validate(h) for h in booking.status_history
            ]
        return resp

    def list_my_bookings(
        self,
        db: Session,
        customer_id: int,
        page: int = 1,
        page_size: int = 10
    ) -> PaginatedResponse[BookingResponse]:
        page = max(1, page)
        page_size = min(max(1, page_size), 50)

        bookings, total = self.booking_repo.list_by_customer(
            db=db,
            customer_id=customer_id,
            page=page,
            page_size=page_size
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 1

        return PaginatedResponse(
            items=[BookingResponse.model_validate(b) for b in bookings],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def cancel_booking(
        self,
        db: Session,
        event_client: BaseEventClient,
        user_id: int,
        user_role: str,
        booking_id: int,
        reason: Optional[str] = None
    ) -> BookingResponse:
        booking = self.booking_repo.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

        # Ownership verification
        if user_role != "ADMIN" and booking.customer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to cancel this booking."
            )

        if booking.status == "CANCELLED":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is already cancelled.")

        if booking.status != "CONFIRMED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel booking in '{booking.status}' status."
            )

        # Update status in booking database
        cancelled_booking = self.booking_repo.cancel_booking(db, booking, reason)

        # Trigger compensating release in Event Service
        event_client.release_tickets(
            event_id=booking.event_id,
            quantity=booking.quantity,
            reservation_id=booking.booking_reference
        )

        return BookingResponse.model_validate(cancelled_booking)

    def list_all_admin_bookings(
        self,
        db: Session,
        status: Optional[str] = None,
        event_id: Optional[int] = None,
        customer_id: Optional[int] = None,
        page: int = 1,
        page_size: int = 20
    ) -> PaginatedResponse[BookingResponse]:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        bookings, total = self.booking_repo.list_all(
            db=db,
            status=status,
            event_id=event_id,
            customer_id=customer_id,
            page=page,
            page_size=page_size
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 1

        return PaginatedResponse(
            items=[BookingResponse.model_validate(b) for b in bookings],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
