from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.booking import Booking
from app.models.status_history import BookingStatusHistory


class BookingRepository:
    def get_by_id(self, db: Session, booking_id: int) -> Optional[Booking]:
        return db.execute(select(Booking).where(Booking.id == booking_id)).scalar_one_or_none()

    def get_by_reference(self, db: Session, reference: str) -> Optional[Booking]:
        return db.execute(select(Booking).where(Booking.booking_reference == reference)).scalar_one_or_none()

    def get_by_idempotency_key(self, db: Session, idempotency_key: str) -> Optional[Booking]:
        return db.execute(select(Booking).where(Booking.idempotency_key == idempotency_key)).scalar_one_or_none()

    def list_by_customer(
        self,
        db: Session,
        customer_id: int,
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[Booking], int]:
        query = select(Booking).where(Booking.customer_id == customer_id)
        count_query = select(func.count()).select_from(query.subquery())
        total = db.execute(count_query).scalar_one()

        offset = (page - 1) * page_size
        bookings = list(
            db.execute(
                query.order_by(Booking.created_at.desc())
                .offset(offset)
                .limit(page_size)
            ).scalars().all()
        )
        return bookings, total

    def list_all(
        self,
        db: Session,
        status: Optional[str] = None,
        event_id: Optional[int] = None,
        customer_id: Optional[int] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Booking], int]:
        query = select(Booking)
        if status:
            query = query.where(Booking.status == status)
        if event_id:
            query = query.where(Booking.event_id == event_id)
        if customer_id:
            query = query.where(Booking.customer_id == customer_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = db.execute(count_query).scalar_one()

        offset = (page - 1) * page_size
        bookings = list(
            db.execute(
                query.order_by(Booking.created_at.desc())
                .offset(offset)
                .limit(page_size)
            ).scalars().all()
        )
        return bookings, total

    def create_booking(self, db: Session, booking_data: dict) -> Booking:
        booking = Booking(**booking_data)
        db.add(booking)
        db.commit()
        db.refresh(booking)

        # Initial status history
        self.add_status_history(
            db=db,
            booking_id=booking.id,
            prev_status=None,
            new_status=booking.status,
            reason="Booking successfully created and confirmed"
        )
        return booking

    def cancel_booking(self, db: Session, booking: Booking, reason: Optional[str]) -> Booking:
        prev_status = booking.status
        booking.status = "CANCELLED"
        booking.cancelled_at = datetime.now(timezone.utc)
        booking.updated_at = datetime.now(timezone.utc)

        db.add(booking)
        db.commit()
        db.refresh(booking)

        self.add_status_history(
            db=db,
            booking_id=booking.id,
            prev_status=prev_status,
            new_status="CANCELLED",
            reason=reason or "Customer cancellation"
        )
        return booking

    def add_status_history(
        self,
        db: Session,
        booking_id: int,
        prev_status: Optional[str],
        new_status: str,
        reason: Optional[str]
    ) -> BookingStatusHistory:
        history = BookingStatusHistory(
            booking_id=booking_id,
            previous_status=prev_status,
            new_status=new_status,
            reason=reason
        )
        db.add(history)
        db.commit()
        return history
