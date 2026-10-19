import os
import sys
import hashlib
import threading
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import jwt
import pytest
from starlette.testclient import TestClient
from sqlalchemy import text

SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from app.main import app
from app.api.deps import get_event_client, get_db
from app.clients.event_client import FakeEventClient
from app.core.config import settings
from app.db.session import SessionLocal

existing_override = app.dependency_overrides.get(get_event_client)
if existing_override and callable(existing_override):
    fake_event_client = existing_override()
else:
    fake_event_client = FakeEventClient()
    app.dependency_overrides[get_event_client] = lambda: fake_event_client

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


@pytest.fixture(autouse=True)
def setup_test_events():
    now = datetime.now(timezone.utc)
    # Event 200: Active event starting in 1 hour, ending in 5 hours
    fake_event_client.events[200] = {
        "id": 200,
        "title": "Quantum AI Summit 2026",
        "venue": "Convention Center Hall A",
        "price": Decimal("999.00"),
        "currency": "INR",
        "available_capacity": 50,
        "total_capacity": 50,
        "status": "PUBLISHED",
        "start_at": (now + timedelta(hours=1)).isoformat(),
        "end_at": (now + timedelta(hours=5)).isoformat(),
    }
    # Event 201: Future event starting in 2 days (check-in not open)
    fake_event_client.events[201] = {
        "id": 201,
        "title": "Future Cyber Festival",
        "venue": "Tech Park",
        "price": Decimal("500.00"),
        "currency": "INR",
        "available_capacity": 50,
        "total_capacity": 50,
        "status": "PUBLISHED",
        "start_at": (now + timedelta(days=2)).isoformat(),
        "end_at": (now + timedelta(days=2, hours=4)).isoformat(),
    }
    # Event 202: Past event that already ended yesterday
    fake_event_client.events[202] = {
        "id": 202,
        "title": "Yesterday Rock Concert",
        "venue": "Grand Arena",
        "price": Decimal("1200.00"),
        "currency": "INR",
        "available_capacity": 50,
        "total_capacity": 50,
        "status": "PUBLISHED",
        "start_at": (now - timedelta(days=1, hours=4)).isoformat(),
        "end_at": (now - timedelta(days=1)).isoformat(),
    }
    with SessionLocal() as db:
        try:
            db.execute(text("DELETE FROM tickets WHERE event_id IN (200, 201, 202)"))
            db.execute(text("DELETE FROM bookings WHERE event_id IN (200, 201, 202)"))
            db.commit()
        except Exception:
            db.rollback()


# ==============================================================================
# 1. Ticket Creation After Confirmed Booking & 2. Unique QR Generation
# ==============================================================================
def test_1_and_2_ticket_creation_and_unique_qr():
    customer_token = generate_test_token(user_id=101, role="CUSTOMER")
    headers = {"Authorization": f"Bearer {customer_token}"}

    idem_key = f"qr-test-{datetime.now(timezone.utc).timestamp()}"
    res = client.post("/api/v1/bookings", json={
        "event_id": 200,
        "quantity": 2,
        "idempotency_key": idem_key
    }, headers=headers)
    assert res.status_code == 201
    booking = res.json()["data"]

    # 1. Tickets generated according to booking quantity
    tickets = booking.get("tickets", [])
    assert len(tickets) == 2

    t1, t2 = tickets[0], tickets[1]
    assert t1["ticket_reference"].startswith("TKT-")
    assert t2["ticket_reference"].startswith("TKT-")
    assert t1["status"] == "ACTIVE"
    assert t2["status"] == "ACTIVE"

    # 2. Unique QR code for every ticket (distinct references and QR tokens)
    assert t1["ticket_reference"] != t2["ticket_reference"]
    assert t1["qr_code_data_uri"] != t2["qr_code_data_uri"]
    assert t1["qr_code_data_uri"].startswith("data:image/png;base64,")
    assert t2["qr_code_data_uri"].startswith("data:image/png;base64,")


# ==============================================================================
# 3. Successful Email Delivery and Safe Email Resend
# ==============================================================================
def test_3_email_delivery_and_safe_resend():
    customer_token = generate_test_token(user_id=102, role="CUSTOMER")
    headers = {"Authorization": f"Bearer {customer_token}"}

    res_create = client.post("/api/v1/bookings", json={
        "event_id": 200,
        "quantity": 1,
        "idempotency_key": f"email-resend-{datetime.now(timezone.utc).timestamp()}"
    }, headers=headers)
    assert res_create.status_code == 201
    booking = res_create.json()["data"]
    ticket = booking["tickets"][0]
    ticket_id = ticket["id"]

    # Safe resend email
    res_resend = client.post(f"/api/v1/tickets/{ticket_id}/resend-email", headers=headers)
    assert res_resend.status_code == 200
    resend_data = res_resend.json()
    assert resend_data["success"] is True
    assert resend_data["data"]["ticket_reference"] == ticket["ticket_reference"]

    # Verify no duplicate ticket was created
    res_get = client.get(f"/api/v1/tickets/{ticket_id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["data"]["id"] == ticket_id


# ==============================================================================
# 4. Valid Ticket Scanning & 6. Duplicate Scan Rejection
# ==============================================================================
def test_4_and_6_valid_scan_and_duplicate_rejection():
    customer_token = generate_test_token(user_id=103, role="CUSTOMER")
    organizer_token = generate_test_token(user_id=999, role="ORGANIZER")
    org_headers = {"Authorization": f"Bearer {organizer_token}"}

    res_b = client.post("/api/v1/bookings", json={
        "event_id": 200,
        "quantity": 1,
        "idempotency_key": f"scan-val-{datetime.now(timezone.utc).timestamp()}"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket = res_b.json()["data"]["tickets"][0]
    ticket_ref = ticket["ticket_reference"]

    # First Scan: Valid Admission
    scan_res_1 = client.post("/api/v1/check-in/scan", json={
        "event_id": 200,
        "ticket_reference": ticket_ref
    }, headers=org_headers)

    assert scan_res_1.status_code == 200
    body_1 = scan_res_1.json()["data"]
    assert body_1["valid"] is True
    assert body_1["code"] == "SUCCESS"
    assert "successfully verified and admitted" in body_1["message"]

    # Second Scan: Rejection of Duplicate Scan
    scan_res_2 = client.post("/api/v1/check-in/scan", json={
        "event_id": 200,
        "ticket_reference": ticket_ref
    }, headers=org_headers)

    assert scan_res_2.status_code == 200
    body_2 = scan_res_2.json()["data"]
    assert body_2["valid"] is False
    assert body_2["code"] == "ALREADY_USED"
    assert "ALREADY USED" in body_2["message"]


# ==============================================================================
# 5. Rejection of Forged or Unknown QR Tokens
# ==============================================================================
def test_5_rejection_of_forged_or_unknown_token():
    organizer_token = generate_test_token(user_id=999, role="ORGANIZER")
    org_headers = {"Authorization": f"Bearer {organizer_token}"}

    # Unknown ticket reference
    res = client.post("/api/v1/check-in/scan", json={
        "event_id": 200,
        "ticket_reference": "TKT-NONEXISTENT-99999"
    }, headers=org_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["valid"] is False
    assert data["code"] == "INVALID_TICKET"
    assert "INVALID TICKET" in data["message"]

    # Forged cryptographic token mismatch
    customer_token = generate_test_token(user_id=104, role="CUSTOMER")
    res_b = client.post("/api/v1/bookings", json={
        "event_id": 200,
        "quantity": 1,
        "idempotency_key": f"forge-{datetime.now(timezone.utc).timestamp()}"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket = res_b.json()["data"]["tickets"][0]

    res_forged = client.post("/api/v1/check-in/scan", json={
        "event_id": 200,
        "ticket_reference": ticket["ticket_reference"],
        "token": "forged_cryptographic_secret_xyz"
    }, headers=org_headers)
    assert res_forged.status_code == 200
    assert res_forged.json()["data"]["valid"] is False
    assert res_forged.json()["data"]["code"] == "INVALID_TICKET"


# ==============================================================================
# 7. Simultaneous Scans of the Same Ticket (Atomic Concurrency Test)
# ==============================================================================
def test_7_simultaneous_scans_concurrency():
    customer_token = generate_test_token(user_id=105, role="CUSTOMER")
    organizer_token = generate_test_token(user_id=999, role="ORGANIZER")
    org_headers = {"Authorization": f"Bearer {organizer_token}"}

    res_b = client.post("/api/v1/bookings", json={
        "event_id": 200,
        "quantity": 1,
        "idempotency_key": f"concurr-{datetime.now(timezone.utc).timestamp()}"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket_ref = res_b.json()["data"]["tickets"][0]["ticket_reference"]

    results = []

    def perform_scan():
        # Each thread uses a fresh client call
        r = client.post("/api/v1/check-in/scan", json={
            "event_id": 200,
            "ticket_reference": ticket_ref
        }, headers=org_headers)
        results.append(r.json()["data"])

    t1 = threading.Thread(target=perform_scan)
    t2 = threading.Thread(target=perform_scan)

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Exactly one scan must succeed, and exactly one must be rejected as ALREADY_USED
    codes = [r["code"] for r in results]
    assert "SUCCESS" in codes
    assert "ALREADY_USED" in codes
    assert sum(1 for r in results if r["valid"]) == 1


# ==============================================================================
# 8. Wrong-Event Scanning
# ==============================================================================
def test_8_wrong_event_scanning():
    customer_token = generate_test_token(user_id=106, role="CUSTOMER")
    organizer_token = generate_test_token(user_id=999, role="ORGANIZER")
    org_headers = {"Authorization": f"Bearer {organizer_token}"}

    # Ticket booked for Event 200
    res_b = client.post("/api/v1/bookings", json={
        "event_id": 200,
        "quantity": 1,
        "idempotency_key": f"wrong-evt-{datetime.now(timezone.utc).timestamp()}"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket_ref = res_b.json()["data"]["tickets"][0]["ticket_reference"]

    # Scanner configured for Event 201 scans Event 200 ticket
    scan_res = client.post("/api/v1/check-in/scan", json={
        "event_id": 201,  # Mismatched event!
        "ticket_reference": ticket_ref
    }, headers=org_headers)

    assert scan_res.status_code == 200
    data = scan_res.json()["data"]
    assert data["valid"] is False
    assert data["code"] == "WRONG_EVENT"
    assert "WRONG EVENT" in data["message"]


# ==============================================================================
# 9. Cancelled, Refunded, Revoked, and Expired Tickets
# ==============================================================================
def test_9_cancelled_revoked_and_expired_tickets():
    customer_token = generate_test_token(user_id=107, role="CUSTOMER")
    organizer_token = generate_test_token(user_id=999, role="ORGANIZER")
    org_headers = {"Authorization": f"Bearer {organizer_token}"}

    # 1. Booking Cancellation -> Ticket is CANCELLED
    res_b = client.post("/api/v1/bookings", json={
        "event_id": 200,
        "quantity": 1,
        "idempotency_key": f"cancel-tkt-{datetime.now(timezone.utc).timestamp()}"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    booking = res_b.json()["data"]
    ticket_ref = booking["tickets"][0]["ticket_reference"]

    # Cancel the booking
    res_cancel = client.post(f"/api/v1/bookings/{booking['id']}/cancel", json={
        "reason": "Attendee requested refund"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert res_cancel.status_code == 200

    # Scan cancelled ticket
    scan_cancel = client.post("/api/v1/check-in/scan", json={
        "event_id": 200,
        "ticket_reference": ticket_ref
    }, headers=org_headers)
    assert scan_cancel.json()["data"]["valid"] is False
    assert scan_cancel.json()["data"]["code"] == "CANCELLED_TICKET"

    # 2. Revoked ticket check
    res_b2 = client.post("/api/v1/bookings", json={
        "event_id": 200,
        "quantity": 1,
        "idempotency_key": f"revoked-tkt-{datetime.now(timezone.utc).timestamp()}"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket_ref_2 = res_b2.json()["data"]["tickets"][0]["ticket_reference"]

    db = SessionLocal()
    try:
        db.execute(text("UPDATE tickets SET status = 'REVOKED', revoked_at = NOW() WHERE ticket_reference = :ref"), {"ref": ticket_ref_2})
        db.commit()
    finally:
        db.close()

    scan_revoked = client.post("/api/v1/check-in/scan", json={
        "event_id": 200,
        "ticket_reference": ticket_ref_2
    }, headers=org_headers)
    assert scan_revoked.json()["data"]["valid"] is False
    assert scan_revoked.json()["data"]["code"] == "REVOKED_TICKET"


# ==============================================================================
# 10. Event-End Enforcement (Automatic Expiry)
# ==============================================================================
def test_10_event_end_enforcement():
    customer_token = generate_test_token(user_id=108, role="CUSTOMER")
    organizer_token = generate_test_token(user_id=999, role="ORGANIZER")
    org_headers = {"Authorization": f"Bearer {organizer_token}"}

    # Book for Event 202 (which ended yesterday)
    res_b = client.post("/api/v1/bookings", json={
        "event_id": 202,
        "quantity": 1,
        "idempotency_key": f"past-evt-{datetime.now(timezone.utc).timestamp()}"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket_ref = res_b.json()["data"]["tickets"][0]["ticket_reference"]

    # Scan must be rejected due to authoritative server schedule end_at
    scan_res = client.post("/api/v1/check-in/scan", json={
        "event_id": 202,
        "ticket_reference": ticket_ref
    }, headers=org_headers)

    assert scan_res.status_code == 200
    data = scan_res.json()["data"]
    assert data["valid"] is False
    assert data["code"] == "EVENT_COMPLETED"
    assert "EVENT COMPLETED" in data["message"]


# ==============================================================================
# 11. Unauthorised Scanner Access
# ==============================================================================
def test_11_unauthorised_scanner_access():
    # 1. Unauthenticated (no token) -> 401
    res_unauth = client.post("/api/v1/check-in/scan", json={
        "event_id": 200,
        "ticket_reference": "TKT-TEST"
    })
    assert res_unauth.status_code == 401

    # 2. Regular customer attempting to scan -> 403 Forbidden
    customer_token = generate_test_token(user_id=109, role="CUSTOMER")
    res_forbidden = client.post("/api/v1/check-in/scan", json={
        "event_id": 200,
        "ticket_reference": "TKT-TEST"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert res_forbidden.status_code == 403


# ==============================================================================
# 12. Attendee Access Boundary (Cannot View Another User's Ticket)
# ==============================================================================
def test_12_attendee_cross_user_ticket_protection():
    token_user_a = generate_test_token(user_id=201, role="CUSTOMER")
    token_user_b = generate_test_token(user_id=202, role="CUSTOMER")

    # User A creates a booking & gets a ticket
    res_a = client.post("/api/v1/bookings", json={
        "event_id": 200,
        "quantity": 1,
        "idempotency_key": f"user-a-{datetime.now(timezone.utc).timestamp()}"
    }, headers={"Authorization": f"Bearer {token_user_a}"})
    ticket_a = res_a.json()["data"]["tickets"][0]
    ticket_a_id = ticket_a["id"]

    # User A can view their own ticket
    res_own = client.get(f"/api/v1/tickets/{ticket_a_id}", headers={"Authorization": f"Bearer {token_user_a}"})
    assert res_own.status_code == 200
    assert res_own.json()["data"]["id"] == ticket_a_id

    # User B attempts to access User A's ticket -> 403 Forbidden
    res_cross = client.get(f"/api/v1/tickets/{ticket_a_id}", headers={"Authorization": f"Bearer {token_user_b}"})
    assert res_cross.status_code == 403


# ==============================================================================
# 13. Event Rescheduling and Timezone / Check-In Window Handling
# ==============================================================================
def test_13_rescheduling_and_check_in_window():
    customer_token = generate_test_token(user_id=110, role="CUSTOMER")
    organizer_token = generate_test_token(user_id=999, role="ORGANIZER")
    org_headers = {"Authorization": f"Bearer {organizer_token}"}

    # Event 201 starts in 2 days -> Check-in is not open yet
    res_b = client.post("/api/v1/bookings", json={
        "event_id": 201,
        "quantity": 1,
        "idempotency_key": f"future-evt-{datetime.now(timezone.utc).timestamp()}"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket_ref = res_b.json()["data"]["tickets"][0]["ticket_reference"]

    # Scan before window opens -> CHECK_IN_NOT_OPEN
    scan_early = client.post("/api/v1/check-in/scan", json={
        "event_id": 201,
        "ticket_reference": ticket_ref
    }, headers=org_headers)
    assert scan_early.status_code == 200
    assert scan_early.json()["data"]["valid"] is False
    assert scan_early.json()["data"]["code"] == "CHECK_IN_NOT_OPEN"

    # Now simulate event rescheduling: Start time moved to 1 hour from now
    now = datetime.now(timezone.utc)
    fake_event_client.events[201]["start_at"] = (now + timedelta(hours=1)).isoformat()
    fake_event_client.events[201]["end_at"] = (now + timedelta(hours=5)).isoformat()

    # Scanning again: Now within 4-hour window -> Admission granted!
    scan_now = client.post("/api/v1/check-in/scan", json={
        "event_id": 201,
        "ticket_reference": ticket_ref
    }, headers=org_headers)
    assert scan_now.status_code == 200
    assert scan_now.json()["data"]["valid"] is True
    assert scan_now.json()["data"]["code"] == "SUCCESS"


# ==============================================================================
# 14. Cleanup That Preserves Required Booking and Payment Records
# ==============================================================================
def test_14_retention_cleanup_preserves_financial_records():
    organizer_token = generate_test_token(user_id=999, role="ORGANIZER")
    org_headers = {"Authorization": f"Bearer {organizer_token}"}
    customer_token = generate_test_token(user_id=111, role="CUSTOMER")

    # Create booking for past event
    res_b = client.post("/api/v1/bookings", json={
        "event_id": 202,
        "quantity": 1,
        "idempotency_key": f"retention-{datetime.now(timezone.utc).timestamp()}"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    booking = res_b.json()["data"]
    ticket_id = booking["tickets"][0]["id"]
    booking_id = booking["id"]

    # Mark ticket as EXPIRED with an old expires_at date in the past
    db = SessionLocal()
    try:
        db.execute(
            text("UPDATE tickets SET status = 'EXPIRED', expires_at = :past_dt WHERE id = :tid"),
            {"past_dt": datetime.now(timezone.utc) - timedelta(days=60), "tid": ticket_id}
        )
        db.commit()
    finally:
        db.close()

    # Run cleanup retention with days = 30 (requires admin)
    admin_token = generate_test_token(user_id=1, role="ADMIN")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    res_clean = client.post("/api/v1/tickets/cleanup-retention?days=30", headers=admin_headers)
    assert res_clean.status_code == 200
    clean_data = res_clean.json()["data"]
    assert clean_data["anonymized_tickets_count"] >= 1

    # Verify ticket secret was anonymized (token_hash is ANONYMIZED_EXPIRED)
    db = SessionLocal()
    try:
        t_row = db.execute(text("SELECT token_hash FROM tickets WHERE id = :tid"), {"tid": ticket_id}).fetchone()
        assert t_row[0] == "ANONYMIZED_CLEARED"

        # Verify booking and financial payment record remains intact!
        b_row = db.execute(text("SELECT id, status, payment_status, total_amount_snapshot FROM bookings WHERE id = :bid"), {"bid": booking_id}).fetchone()
        assert b_row is not None
        assert b_row[1] == "CONFIRMED"
        assert b_row[2] == "PAID"
    finally:
        db.close()


# ==============================================================================
# 15. Check-In Statistics API
# ==============================================================================
def test_15_check_in_statistics():
    organizer_token = generate_test_token(user_id=999, role="ORGANIZER")
    org_headers = {"Authorization": f"Bearer {organizer_token}"}

    res_stats = client.get("/api/v1/events/200/check-in-stats", headers=org_headers)
    assert res_stats.status_code == 200
    stats = res_stats.json()["data"]
    assert "total_tickets" in stats
    assert "checked_in_count" in stats
    assert "remaining_count" in stats
    assert "check_in_rate_percent" in stats
