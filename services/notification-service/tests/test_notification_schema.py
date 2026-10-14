import os
import sys
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from app.models.notification import NotificationRecord
from app.models.processed_message import ProcessedMessage

DATABASE_URL = os.getenv(
    "NOTIFICATION_DATABASE_URL",
    "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_notification_db"
)


def test_notification_record_lifecycle():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    rec = NotificationRecord(
        event_type="VERIFY_EMAIL",
        recipient="dev_user@example.com",
        status="PENDING",
        attempts=0
    )
    session.add(rec)
    session.commit()
    assert rec.id is not None
    assert rec.status == "PENDING"

    # Simulate worker updating status to SENT
    rec.status = "SENT"
    rec.sent_at = datetime.now(timezone.utc)
    rec.attempts += 1
    session.commit()

    assert rec.status == "SENT"
    assert rec.attempts == 1
    assert rec.sent_at is not None

    session.delete(rec)
    session.commit()
    session.close()


def test_processed_message_idempotency():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    msg_id = f"msg-uuid-{datetime.now(timezone.utc).timestamp()}"
    p_msg = ProcessedMessage(message_id=msg_id)
    session.add(p_msg)
    session.commit()
    assert p_msg.message_id == msg_id

    # Duplicate message ID should fail primary key constraint
    p_dup = ProcessedMessage(message_id=msg_id)
    session.add(p_dup)
    with pytest.raises(IntegrityError):
        session.commit()

    session.rollback()
    session.delete(p_msg)
    session.commit()
    session.close()
