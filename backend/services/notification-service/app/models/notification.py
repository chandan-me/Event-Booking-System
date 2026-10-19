from sqlalchemy import Column, BigInteger, String, Integer, Text, DateTime
from .base import Base, utc_now


class NotificationRecord(Base):
    __tablename__ = "notification_records"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # 'VERIFY_EMAIL', 'BOOKING_CONFIRMATION'
    recipient = Column(String(255), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="PENDING", index=True)  # 'PENDING', 'SENT', 'FAILED'
    attempts = Column(Integer, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    sent_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<NotificationRecord id={self.id} type={self.event_type} recipient={self.recipient} status={self.status}>"
