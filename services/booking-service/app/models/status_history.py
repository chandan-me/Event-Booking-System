from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, utc_now


class BookingStatusHistory(Base):
    __tablename__ = "booking_status_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    booking_id = Column(BigInteger, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=False)
    reason = Column(String(255), nullable=True)
    changed_at = Column(DateTime, nullable=False, default=utc_now)

    booking = relationship("Booking", back_populates="status_history")

    def __repr__(self):
        return f"<BookingStatusHistory id={self.id} booking_id={self.booking_id} status={self.new_status}>"
