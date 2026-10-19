import os
import sys
import threading
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import jwt
from starlette.testclient import TestClient

SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from app.main import app
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.category import EventCategory
from app.models.event import Event

client = TestClient(app)


def delete_test_records(event_id: int = None, category_id: int = None):
    """Clean up test entities immediately to keep the database catalog pure."""
    db = SessionLocal()
    try:
        if event_id:
            db.query(Event).filter(Event.id == event_id).delete()
        if category_id:
            db.query(EventCategory).filter(EventCategory.id == category_id).delete()
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def generate_test_token(user_id: int, role: str) -> str:
    """Helper to generate a test JWT matching Auth Service signing parameters."""
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


def test_category_management():
    admin_token = generate_test_token(user_id=1, role="ADMIN")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Non-admin cannot create category
    r_anon = client.post("/api/v1/categories", json={"name": "Conference"})
    assert r_anon.status_code == 401

    customer_token = generate_test_token(user_id=2, role="CUSTOMER")
    r_cust = client.post("/api/v1/categories", json={"name": "Conference"}, headers={"Authorization": f"Bearer {customer_token}"})
    assert r_cust.status_code == 403

    # 2. Admin creates category
    cat_id = None
    try:
        unique_name = f"Test Category {int(datetime.now(timezone.utc).timestamp())}"
        r_admin = client.post("/api/v1/categories", json={"name": unique_name}, headers=headers)
        assert r_admin.status_code == 201
        cat_data = r_admin.json()["data"]
        cat_id = cat_data["id"]
        assert cat_data["name"] == unique_name
        assert cat_id is not None

        # 3. Public can list categories
        r_list = client.get("/api/v1/categories")
        assert r_list.status_code == 200
        assert any(c["id"] == cat_id for c in r_list.json()["data"])
    finally:
        delete_test_records(category_id=cat_id)


def test_event_lifecycle_and_admin_authorization():
    admin_token = generate_test_token(user_id=1, role="ADMIN")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    category_id = None
    event_id = None
    try:
        # Create category first
        cat_res = client.post(
            "/api/v1/categories",
            json={"name": f"Test Cat {int(datetime.now(timezone.utc).timestamp())}"},
            headers=admin_headers
        )
        category_id = cat_res.json()["data"]["id"]

        now = datetime.now(timezone.utc)
        start_time = (now + timedelta(days=10)).isoformat()
        end_time = (now + timedelta(days=10, hours=3)).isoformat()

        # Date validation: end_at before start_at must be rejected
        bad_dates_payload = {
            "title": "Bad Date Marathon",
            "description": "Testing invalid dates",
            "category_id": category_id,
            "venue_name": "City Arena",
            "venue_address": "100 Sports Blvd",
            "start_at": end_time,
            "end_at": start_time,
            "price": "25.00",
            "total_capacity": 50,
            "status": "PUBLISHED"
        }
        r_bad_date = client.post("/api/v1/events", json=bad_dates_payload, headers=admin_headers)
        assert r_bad_date.status_code == 422

        # Admin creates valid published event
        event_payload = {
            "title": "City Marathon 2026",
            "description": "Annual half marathon running event",
            "category_id": category_id,
            "venue_name": "City Arena",
            "venue_address": "100 Sports Blvd",
            "start_at": start_time,
            "end_at": end_time,
            "price": "35.50",
            "currency": "USD",
            "total_capacity": 100,
            "status": "PUBLISHED"
        }
        r_create = client.post("/api/v1/events", json=event_payload, headers=admin_headers)
        assert r_create.status_code == 201
        event = r_create.json()["data"]
        event_id = event["id"]
        assert event["title"] == "City Marathon 2026"
        assert event["available_capacity"] == 100

        # Public listing and filtering
        r_list = client.get(f"/api/v1/events?category_id={category_id}&search=Marathon")
        assert r_list.status_code == 200
        items = r_list.json()["data"]["items"]
        assert len(items) >= 1
        assert items[0]["id"] == event_id

        # Public single event detail
        r_get = client.get(f"/api/v1/events/{event_id}")
        assert r_get.status_code == 200
        assert r_get.json()["data"]["venue_name"] == "City Arena"

        # Admin updates event
        r_update = client.patch(
            f"/api/v1/events/{event_id}",
            json={"venue_name": "Olympic Stadium", "total_capacity": 150},
            headers=admin_headers
        )
        assert r_update.status_code == 200
        assert r_update.json()["data"]["venue_name"] == "Olympic Stadium"
        assert r_update.json()["data"]["available_capacity"] == 150

        # Admin cancels event
        r_cancel = client.delete(f"/api/v1/events/{event_id}", headers=admin_headers)
        assert r_cancel.status_code == 200
        assert r_cancel.json()["data"]["status"] == "CANCELLED"
    finally:
        delete_test_records(event_id=event_id, category_id=category_id)


def test_atomic_inventory_reservation_and_compensation():
    admin_token = generate_test_token(user_id=1, role="ADMIN")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    category_id = None
    event_id = None
    try:
        # Create category & event with exactly 5 tickets
        cat_res = client.post(
            "/api/v1/categories",
            json={"name": f"Test Workshop {int(datetime.now(timezone.utc).timestamp())}"},
            headers=admin_headers
        )
        category_id = cat_res.json()["data"]["id"]

        now = datetime.now(timezone.utc)
        event_res = client.post(
            "/api/v1/events",
            json={
                "title": "Exclusive Coding Workshop",
                "description": "Hands-on microservices masterclass",
                "category_id": category_id,
                "venue_name": "Tech Lab 4",
                "venue_address": "404 Binary Way",
                "start_at": (now + timedelta(days=5)).isoformat(),
                "end_at": (now + timedelta(days=5, hours=4)).isoformat(),
                "price": "99.00",
                "total_capacity": 5,
                "status": "PUBLISHED"
            },
            headers=admin_headers
        )
        event_id = event_res.json()["data"]["id"]

        # 1. Reserve 3 tickets successfully
        reserve_payload = {"quantity": 3, "reservation_id": "res-test-001"}
        r_res1 = client.post(f"/api/v1/internal/events/{event_id}/reserve", json=reserve_payload)
        assert r_res1.status_code == 200
        assert r_res1.json()["data"]["remaining_capacity"] == 2

        # 2. Attempt to reserve 3 tickets when only 2 remain -> Must return 409 Conflict
        overbook_payload = {"quantity": 3, "reservation_id": "res-test-002"}
        r_res2 = client.post(f"/api/v1/internal/events/{event_id}/reserve", json=overbook_payload)
        assert r_res2.status_code == 409
        assert r_res2.json()["error"]["code"] == "INSUFFICIENT_INVENTORY"

        # 3. Compensating release: release the 3 tickets
        release_payload = {"quantity": 3, "reservation_id": "res-test-001"}
        r_rel = client.post(f"/api/v1/internal/events/{event_id}/release", json=release_payload)
        assert r_rel.status_code == 200
        assert r_rel.json()["data"]["remaining_capacity"] == 5
    finally:
        delete_test_records(event_id=event_id, category_id=category_id)


def test_concurrent_reservation_prevents_overbooking():
    admin_token = generate_test_token(user_id=1, role="ADMIN")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    category_id = None
    event_id = None
    try:
        cat_res = client.post(
            "/api/v1/categories",
            json={"name": f"Test Race {int(datetime.now(timezone.utc).timestamp())}"},
            headers=admin_headers
        )
        category_id = cat_res.json()["data"]["id"]

        now = datetime.now(timezone.utc)
        event_res = client.post(
            "/api/v1/events",
            json={
                "title": "One Ticket Only Show",
                "description": "High contention concert",
                "category_id": category_id,
                "venue_name": "Intimate Club",
                "venue_address": "1 Small Street",
                "start_at": (now + timedelta(days=2)).isoformat(),
                "end_at": (now + timedelta(days=2, hours=2)).isoformat(),
                "price": "150.00",
                "total_capacity": 1,
                "status": "PUBLISHED"
            },
            headers=admin_headers
        )
        event_id = event_res.json()["data"]["id"]

        results = []
        threads = []
        num_threads = 10

        def attempt_reservation(thread_idx: int):
            t_client = TestClient(app)
            res = t_client.post(
                f"/api/v1/internal/events/{event_id}/reserve",
                json={"quantity": 1, "reservation_id": f"race-res-{thread_idx}"}
            )
            results.append(res.status_code)

        for i in range(num_threads):
            t = threading.Thread(target=attempt_reservation, args=(i,))
            threads.append(t)

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        success_count = results.count(200)
        conflict_count = results.count(409)

        assert success_count == 1, f"Expected exactly 1 successful reservation, got {success_count}"
        assert conflict_count == 9, f"Expected exactly 9 conflicts, got {conflict_count}"

        r_final = client.get(f"/api/v1/events/{event_id}")
        assert r_final.status_code == 200
        assert r_final.json()["data"]["available_capacity"] == 0
    finally:
        delete_test_records(event_id=event_id, category_id=category_id)
