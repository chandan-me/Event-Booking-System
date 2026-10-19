import secrets
from sqlalchemy import (
    Column, BigInteger, Integer, String, Text, Numeric, DateTime,
    ForeignKey, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from .base import Base, utc_now


def generate_random_id() -> int:
    """Generate random numeric ID (8 digits, strictly numbers)."""
    return secrets.randbelow(89999999) + 10000000


class Event(Base):
    __tablename__ = "events"

    id = Column(BigInteger, primary_key=True, default=generate_random_id, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("event_categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    venue_name = Column(String(255), nullable=False)
    venue_address = Column(String(255), nullable=False)
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=False)
    price = Column(Numeric(precision=10, scale=2), nullable=False, default=0.00)
    currency = Column(String(3), nullable=False, default="INR")
    total_capacity = Column(Integer, nullable=False)
    available_capacity = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="DRAFT", index=True)  # 'DRAFT', 'PUBLISHED', 'CANCELLED'
    created_by = Column(BigInteger, nullable=False)  # Admin user ID (logical reference to Auth Service)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    category = relationship("EventCategory", back_populates="events")

    __table_args__ = (
        CheckConstraint("available_capacity >= 0", name="chk_available_capacity_non_negative"),
        CheckConstraint("total_capacity >= available_capacity", name="chk_total_gte_available"),
        Index("idx_events_status_category_dates", "status", "category_id", "start_at"),
    )

    def __repr__(self):
        return f"<Event id={self.id} title={self.title} available={self.available_capacity}/{self.total_capacity}>"
