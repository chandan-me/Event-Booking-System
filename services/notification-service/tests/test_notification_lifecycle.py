import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from app.main import app
from app.db.session import SessionLocal
from app.api.deps import get_email_sender
from app.services.email_sender import FakeEmailSender
from app.repositories.notification_repository import NotificationRepository
from app.messaging.consumer import process_notification_event
from app.schemas.notification import NotificationEventMessage
from app.templates.email_templates import (
    render_otp_template,
    render_booking_confirmation_template,
    render_booking_cancellation_template
)
from app.core.config import settings

fake_email_sender = FakeEmailSender()
app.dependency_overrides[get_email_sender] = lambda: fake_email_sender

client = TestClient(app)


def generate_test_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": f"user{user_id}@test.com",
        "role": role,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int((datetime.now(timezone.utc) + timedelta(minutes=60)).timestamp()),
        "type": "access"
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def test_health_and_readiness_probes():
    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "healthy"

    r_ready = client.get("/health/ready")
    assert r_ready.status_code == 200
    assert r_ready.json()["status"] == "ready"


def test_html_template_renderers():
    otp_html = render_otp_template("654321", "VERIFY_EMAIL", 5)
    assert "654321" in otp_html
    assert "Verify Your Email" in otp_html

    conf_html = render_booking_confirmation_template(
        booking_ref="BK-20261014-99AA",
        event_title="Grand Gala",
        quantity=2,
        total_amount="120.00",
        currency="USD",
        venue_name="Concert Hall"
    )
    assert "BK-20261014-99AA" in conf_html
    assert "Grand Gala" in conf_html
    assert "120.00 USD" in conf_html

    cancel_html = render_booking_cancellation_template(
        booking_ref="BK-20261014-99AA",
        event_title="Grand Gala",
        quantity=2,
        reason="Flight delayed"
    )
    assert "BK-20261014-99AA" in cancel_html
    assert "Booking Cancelled" in cancel_html
    assert "Flight delayed" in cancel_html


def test_idempotent_event_consumption():
    db: Session = SessionLocal()
    notif_repo = NotificationRepository()
    test_msg_id = f"msg-test-{uuid.uuid4().hex}"

    msg = NotificationEventMessage(
        message_id=test_msg_id,
        event_type="BOOKING_CONFIRMATION",
        recipient="dev_guest@example.com",
        payload={
            "booking_reference": "BK-20261014-TEST1",
            "event_title": "AI Summit 2026",
            "quantity": 1,
            "total_amount": "99.00",
            "currency": "USD"
        }
    )

    initial_sent_count = len(fake_email_sender.outbox)

    # 1. First execution: should deliver email and mark processed
    success = process_notification_event(
        db=db,
        email_sender=fake_email_sender,
        notif_repo=notif_repo,
        event_msg=msg
    )
    assert success is True
    assert len(fake_email_sender.outbox) == initial_sent_count + 1

    last_email = fake_email_sender.get_last_email_for("dev_guest@example.com")
    assert last_email is not None
    assert "BK-20261014-TEST1" in last_email["html_body"]

    # 2. Duplicate Execution: simulate RabbitMQ message redelivery
    # Idempotency check should recognize message_id and skip sending duplicate email!
    success_dup = process_notification_event(
        db=db,
        email_sender=fake_email_sender,
        notif_repo=notif_repo,
        event_msg=msg
    )
    assert success_dup is True
    # Outbox length must NOT increase!
    assert len(fake_email_sender.outbox) == initial_sent_count + 1

    db.close()


def test_direct_dispatch_and_admin_audit_api():
    admin_token = generate_test_token(user_id=1, role="ADMIN")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Dispatch via direct API
    req_body = {
        "event_type": "VERIFY_EMAIL",
        "recipient": "direct_user@example.com",
        "payload": {"otp": "888999"}
    }
    r_direct = client.post("/api/v1/notifications/send-direct", json=req_body)
    assert r_direct.status_code == 200
    assert r_direct.json()["success"] is True

    # Admin lists audit records
    r_audit = client.get("/api/v1/notifications?recipient=direct_user@example.com", headers=admin_headers)
    assert r_audit.status_code == 200
    items = r_audit.json()["data"]["items"]
    assert len(items) >= 1
    assert items[0]["recipient"] == "direct_user@example.com"
    assert items[0]["status"] == "SENT"
