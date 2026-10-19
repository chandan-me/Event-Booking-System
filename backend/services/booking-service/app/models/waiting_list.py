import secrets
from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Index
from .base import Base, utc_now


def generate_waiting_list_id() -> int:
    """Generate random numeric ID (8 digits, strictly numbers)."""
    return secrets.randbelow(89999999) + 10000000


class WaitingList(Base):
    __tablename__ = "waiting_list"

    id = Column(BigInteger, primary_key=True, default=generate_waiting_list_id, index=True)
    event_id = Column(BigInteger, nullable=False, index=True)
    customer_id = Column(BigInteger, nullable=False, index=True)
    customer_email = Column(String(255), nullable=False, index=True)
    customer_name = Column(String(255), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    preferred_tier = Column(String(100), nullable=True, default="General Admission")
    notes = Column(String(500), nullable=True)
    status = Column(String(30), nullable=False, default="WAITING", index=True)  # 'WAITING', 'NOTIFIED', 'CONVERTED', 'CANCELLED'
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        Index("idx_waiting_list_event_status", "event_id", "status"),
        Index("idx_waiting_list_customer_event", "customer_id", "event_id"),
    )

    def __repr__(self):
        return f"<WaitingList id={self.id} event_id={self.event_id} customer={self.customer_email} qty={self.quantity} status={self.status}>"
