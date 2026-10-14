from sqlalchemy import Column, BigInteger, Integer, String, Numeric, DateTime, Index
from sqlalchemy.orm import relationship
from .base import Base, utc_now


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    booking_reference = Column(String(32), unique=True, nullable=False, index=True)
    customer_id = Column(BigInteger, nullable=False, index=True)  # Logical reference to Auth Service user
    event_id = Column(BigInteger, nullable=False, index=True)     # Logical reference to Event Service event
    quantity = Column(Integer, nullable=False)
    unit_price_snapshot = Column(Numeric(precision=10, scale=2), nullable=False)
    total_amount_snapshot = Column(Numeric(precision=10, scale=2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    status = Column(String(20), nullable=False, default="CONFIRMED", index=True)  # 'PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED'
    idempotency_key = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)
    cancelled_at = Column(DateTime, nullable=True)

    status_history = relationship("BookingStatusHistory", back_populates="booking", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_bookings_customer_created", "customer_id", "created_at"),
    )

    def __repr__(self):
        return f"<Booking id={self.id} ref={self.booking_reference} status={self.status}>"
