import os
import sys
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import jwt
from starlette.testclient import TestClient

SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from app.main import app
from app.api.deps import get_event_client
from app.clients.event_client import FakeEventClient
from app.core.config import settings

# Inject FakeEventClient for deterministic local test runs
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


def test_health_and_readiness_probes():
    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "healthy"

    r_ready = client.get("/health/ready")
    assert r_ready.status_code == 200
    assert r_ready.json()["status"] == "ready"


def test_successful_booking_creation_and_idempotency():
    customer_token = generate_test_token(user_id=10, role="CUSTOMER")
    headers = {"Authorization": f"Bearer {customer_token}"}

    # Setup mock event with capacity 10, price 50.00
    fake_event_client.events[100] = {
        "id": 100,
        "title": "Jazz Gala",
        "price": Decimal("50.00"),
        "currency": "USD",
        "available_capacity": 10,
        "total_capacity": 10,
        "status": "PUBLISHED"
    }

    idempotency_key = f"client-idem-{datetime.now(timezone.utc).timestamp()}"
    booking_req = {
        "event_id": 100,
        "quantity": 2,
        "idempotency_key": idempotency_key
    }

    # 1. Create Booking
    r_create = client.post("/api/v1/bookings", json=booking_req, headers=headers)
    assert r_create.status_code == 201
    booking = r_create.json()["data"]

    assert booking["customer_id"] == 10
    assert booking["event_id"] == 100
    assert booking["quantity"] == 2
    assert booking["unit_price_snapshot"] == "50.00"
    assert booking["total_amount_snapshot"] == "100.00"
    assert booking["status"] == "CONFIRMED"
    assert booking["booking_reference"].startswith("BK-")

    # Verify Event Service capacity decremented to 8
    assert fake_event_client.events[100]["available_capacity"] == 8

    # 2. Idempotency Test: Repeat identical request with same idempotency key
    r_repeat = client.post("/api/v1/bookings", json=booking_req, headers=headers)
    assert r_repeat.status_code == 201
    repeat_booking = r_repeat.json()["data"]

    # Must return exact same booking without double-reserving
    assert repeat_booking["id"] == booking["id"]
    assert repeat_booking["booking_reference"] == booking["booking_reference"]
    assert fake_event_client.events[100]["available_capacity"] == 8  # Still 8, not 6!


def test_insufficient_inventory_rejection():
    customer_token = generate_test_token(user_id=11, role="CUSTOMER")
    headers = {"Authorization": f"Bearer {customer_token}"}

    # Setup sold-out event
    fake_event_client.events[101] = {
        "id": 101,
        "title": "Sold Out Concert",
        "price": Decimal("75.00"),
        "currency": "USD",
        "available_capacity": 1,
        "total_capacity": 10,
        "status": "PUBLISHED"
    }

    # Request 2 tickets when only 1 is available
    r = client.post("/api/v1/bookings", json={"event_id": 101, "quantity": 2}, headers=headers)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "INSUFFICIENT_INVENTORY"


def test_customer_ownership_security_and_cancellation():
    cust_a_token = generate_test_token(user_id=20, role="CUSTOMER")
    cust_b_token = generate_test_token(user_id=21, role="CUSTOMER")
    admin_token = generate_test_token(user_id=1, role="ADMIN")

    headers_a = {"Authorization": f"Bearer {cust_a_token}"}
    headers_b = {"Authorization": f"Bearer {cust_b_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    fake_event_client.events[102] = {
        "id": 102,
        "title": "Indie Film Premier",
        "price": Decimal("20.00"),
        "currency": "USD",
        "available_capacity": 5,
        "total_capacity": 5,
        "status": "PUBLISHED"
    }

    # Customer A creates booking for 2 tickets
    r_create = client.post("/api/v1/bookings", json={"event_id": 102, "quantity": 2}, headers=headers_a)
    assert r_create.status_code == 201
    booking_id = r_create.json()["data"]["id"]
    assert fake_event_client.events[102]["available_capacity"] == 3

    # 1. Customer B tries to view Customer A's booking -> Forbidden
    r_view_b = client.get(f"/api/v1/bookings/{booking_id}", headers=headers_b)
    assert r_view_b.status_code == 403

    # 2. Customer B tries to cancel Customer A's booking -> Forbidden
    r_cancel_b = client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=headers_b)
    assert r_cancel_b.status_code == 403

    # 3. Customer A views their own booking -> OK
    r_view_a = client.get(f"/api/v1/bookings/{booking_id}", headers=headers_a)
    assert r_view_a.status_code == 200
    assert r_view_a.json()["data"]["id"] == booking_id

    # 4. Customer A views their booking history list
    r_history = client.get("/api/v1/bookings/me", headers=headers_a)
    assert r_history.status_code == 200
    assert any(b["id"] == booking_id for b in r_history.json()["data"]["items"])

    # 5. Admin views Customer A's booking -> OK
    r_admin_view = client.get(f"/api/v1/bookings/{booking_id}", headers=headers_admin)
    assert r_admin_view.status_code == 200

    # 6. Customer A cancels their booking
    r_cancel_a = client.post(
        f"/api/v1/bookings/{booking_id}/cancel",
        json={"reason": "Schedule change"},
        headers=headers_a
    )
    assert r_cancel_a.status_code == 200
    assert r_cancel_a.json()["data"]["status"] == "CANCELLED"

    # Verify inventory was compensated back to Event Service (3 + 2 = 5)
    assert fake_event_client.events[102]["available_capacity"] == 5

    # 7. Attempting to cancel already cancelled booking returns 400
    r_repeat_cancel = client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=headers_a)
    assert r_repeat_cancel.status_code == 400


def test_admin_booking_management_endpoint():
    admin_token = generate_test_token(user_id=1, role="ADMIN")
    cust_token = generate_test_token(user_id=30, role="CUSTOMER")

    # Customer forbidden from administrative list
    r_cust = client.get("/api/v1/admin/bookings", headers={"Authorization": f"Bearer {cust_token}"})
    assert r_cust.status_code == 403

    # Admin lists all bookings with filters
    r_admin = client.get("/api/v1/admin/bookings?status=CONFIRMED", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_admin.status_code == 200
    assert "items" in r_admin.json()["data"]


def test_razorpay_order_and_booking_storage():
    cust_token = generate_test_token(user_id=45, role="CUSTOMER")
    headers = {"Authorization": f"Bearer {cust_token}"}

    # Setup published event
    fake_event_client.events[200] = {
        "id": 200,
        "title": "Bangalore Tech Summit",
        "price": Decimal("1499.00"),
        "currency": "INR",
        "available_capacity": 50,
        "total_capacity": 50,
        "status": "PUBLISHED"
    }

    # 1. Create Razorpay order
    r_order = client.post(
        "/api/v1/bookings/razorpay/order",
        json={"event_id": 200, "quantity": 2},
        headers=headers
    )
    assert r_order.status_code == 200
    order_data = r_order.json()["data"]
    assert order_data["currency"] == "INR"
    assert order_data["amount"] == 299800  # 1499 * 2 * 100 paise
    assert order_data["order_id"].startswith("order_")

    # 2. Verify Razorpay signature endpoint
    r_verify = client.post(
        "/api/v1/bookings/razorpay/verify",
        json={
            "razorpay_order_id": order_data["order_id"],
            "razorpay_payment_id": "pay_test987654321",
            "razorpay_signature": "sig_mock_signature_test_123"
        },
        headers=headers
    )
    assert r_verify.status_code == 200
    assert r_verify.json()["data"]["verified"] is True

    # 3. Complete booking with Razorpay IDs and verify storage in database
    r_booking = client.post(
        "/api/v1/bookings",
        json={
            "event_id": 200,
            "quantity": 2,
            "razorpay_order_id": order_data["order_id"],
            "razorpay_payment_id": "pay_test987654321",
            "razorpay_signature": "sig_mock_signature_test_123"
        },
        headers=headers
    )
    assert r_booking.status_code == 201
    booking = r_booking.json()["data"]
    assert booking["razorpay_order_id"] == order_data["order_id"]
    assert booking["razorpay_payment_id"] == "pay_test987654321"
    assert booking["payment_status"] == "PAID"
    assert booking["currency"] == "INR"
