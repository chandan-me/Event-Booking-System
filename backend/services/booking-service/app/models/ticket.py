import secrets
from sqlalchemy import Column, BigInteger, String, DateTime, Index, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, utc_now


def generate_ticket_numeric_id() -> int:
    """Generate random numeric ID (8 digits, strictly numbers)."""
    return secrets.randbelow(89999999) + 10000000


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(BigInteger, primary_key=True, default=generate_ticket_numeric_id, index=True)
    booking_id = Column(BigInteger, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(BigInteger, nullable=False, index=True)
    customer_id = Column(BigInteger, nullable=False, index=True)
    ticket_reference = Column(String(64), unique=True, nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, index=True)
    seat_label = Column(String(64), nullable=False, default="General Admission")
    status = Column(String(20), nullable=False, default="ACTIVE", index=True)
    issued_at = Column(DateTime, nullable=False, default=utc_now)
    expires_at = Column(DateTime, nullable=True)
    checked_in_at = Column(DateTime, nullable=True)
    checked_in_by = Column(String(128), nullable=True)
    check_in_notes = Column(String(255), nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    booking = relationship("Booking", back_populates="tickets")

    __table_args__ = (
        Index("idx_tickets_event_status", "event_id", "status"),
        Index("idx_tickets_customer_status", "customer_id", "status"),
    )

    def __repr__(self):
        return f"<Ticket id={self.id} ref={self.ticket_reference} status={self.status}>"
