from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.notification import NotificationRecord
from app.models.processed_message import ProcessedMessage


class NotificationRepository:
    def is_message_processed(self, db: Session, message_id: str) -> bool:
        """Check if message_id has already been processed to guarantee idempotency."""
        result = db.execute(
            select(ProcessedMessage).where(ProcessedMessage.message_id == message_id)
        ).scalar_one_or_none()
        return result is not None

    def mark_message_processed(self, db: Session, message_id: str) -> ProcessedMessage:
        processed = ProcessedMessage(message_id=message_id)
        db.add(processed)
        db.commit()
        return processed

    def create_record(
        self,
        db: Session,
        event_type: str,
        recipient: str,
        status: str = "PENDING"
    ) -> NotificationRecord:
        record = NotificationRecord(
            event_type=event_type,
            recipient=recipient,
            status=status,
            attempts=0
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update_record_status(
        self,
        db: Session,
        record: NotificationRecord,
        status: str,
        last_error: Optional[str] = None
    ) -> NotificationRecord:
        record.status = status
        record.attempts += 1
        record.last_error = last_error
        if status == "SENT":
            record.sent_at = datetime.now(timezone.utc)
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def list_records(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 20,
        event_type: Optional[str] = None,
        status: Optional[str] = None,
        recipient: Optional[str] = None
    ) -> Tuple[List[NotificationRecord], int]:
        query = select(NotificationRecord)
        if event_type:
            query = query.where(NotificationRecord.event_type == event_type)
        if status:
            query = query.where(NotificationRecord.status == status)
        if recipient:
            query = query.where(NotificationRecord.recipient == recipient)

        count_query = select(func.count()).select_from(query.subquery())
        total = db.execute(count_query).scalar_one()

        offset = (page - 1) * page_size
        records = list(
            db.execute(
                query.order_by(NotificationRecord.created_at.desc())
                .offset(offset)
                .limit(page_size)
            ).scalars().all()
        )
        return records, total
