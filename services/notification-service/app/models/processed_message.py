from sqlalchemy import Column, String, DateTime
from .base import Base, utc_now


class ProcessedMessage(Base):
    __tablename__ = "processed_messages"

    message_id = Column(String(64), primary_key=True, index=True)
    processed_at = Column(DateTime, nullable=False, default=utc_now)

    def __repr__(self):
        return f"<ProcessedMessage id={self.message_id} at={self.processed_at}>"
