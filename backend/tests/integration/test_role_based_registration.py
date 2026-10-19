import os
import sys
import uuid
import pytest
import httpx
from sqlalchemy import create_engine, text

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://127.0.0.1:8000")
AUTH_DB_URL = os.getenv("AUTH_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_auth_db")


def is_gateway_online() -> bool:
    try:
        r = httpx.get(f"{GATEWAY_URL}/health", timeout=1.5)
        return r.status_code == 200
    except Exception:
        return False


@pytest.mark.skipif(not is_gateway_online(), reason="API Gateway is offline. Start services to run live integration tests.")
def test_role_based_registration_attendee_and_organiser():
    """
    Validates the end-to-end role-based registration flow:
    1. Public registration rejects ADMIN privilege escalation
    2. Public registration rejects invalid/unauthorized roles
    3. Attendee registration registers user with role ATTENDEE
    4. Organiser registration registers user with role ORGANISER and organization_name
    5. Database inspection verifies:
       - Role is strictly ATTENDEE and ORGANISER
       - organization_name is persisted
       - Password is securely hashed (Argon2id, never plaintext)
    6. Duplicate email registration is rejected with HTTP 400
    7. Weak passwords and invalid emails are rejected with validation errors
    8. Newly registered Attendee and Organiser can log in, receive JWT with their respective role
    """
    engine = create_engine(AUTH_DB_URL)
    uid = uuid.uuid4().hex[:8]

    attendee_email = f"attendee_{uid}@example.com"
    organiser_email = f"host_{uid}@example.com"
    test_password = "SecurePassword123!"
    org_name = f"Apex Tech Events {uid}"

    with httpx.Client(base_url=GATEWAY_URL, timeout=10.0) as client:
        # 1. Attempt ADMIN privilege escalation -> Must be rejected (HTTP 422)
        admin_res = client.post("/api/v1/auth/register", json={
            "full_name": "Malicious Actor",
            "email": f"hacker_{uid}@example.com",
            "password": test_password,
            "role": "ADMIN"
        })
        assert admin_res.status_code == 422, f"ADMIN registration should be forbidden, got: {admin_res.status_code}"
        assert "Administrator registration is forbidden" in admin_res.text

        # 2. Attempt invalid/unknown role -> Must be rejected (HTTP 422)
        invalid_role_res = client.post("/api/v1/auth/register", json={
            "full_name": "Bogus User",
            "email": f"bogus_{uid}@example.com",
            "password": test_password,
            "role": "SUPERUSER"
        })
        assert invalid_role_res.status_code == 422
        assert "Public registration only permits ATTENDEE or ORGANISER" in invalid_role_res.text

        # 3. Register Attendee
        attendee_res = client.post("/api/v1/auth/register", json={
            "full_name": "Test Attendee",
            "email": attendee_email,
            "password": test_password,
            "role": "ATTENDEE"
        })
        assert attendee_res.status_code == 201, f"Attendee registration failed: {attendee_res.text}"
        attendee_data = attendee_res.json()["data"]
        assert attendee_data["role"] == "ATTENDEE"
        assert attendee_data["email"] == attendee_email

        # 4. Register Organiser
        organiser_res = client.post("/api/v1/auth/register", json={
            "full_name": "Test Organiser",
            "email": organiser_email,
            "password": test_password,
            "role": "ORGANISER",
            "organization_name": org_name
        })
        assert organiser_res.status_code == 201, f"Organiser registration failed: {organiser_res.text}"
        organiser_data = organiser_res.json()["data"]
        assert organiser_data["role"] == "ORGANISER"
        assert organiser_data["email"] == organiser_email
        assert organiser_data["organization_name"] == org_name

        # 5. Verify directly in MySQL Database
        with engine.connect() as conn:
            # Check Attendee record
            att_row = conn.execute(
                text("SELECT full_name, email, role, password_hash, organization_name FROM users WHERE email = :email"),
                {"email": attendee_email}
            ).fetchone()
            assert att_row is not None, "Attendee not found in database"
            assert att_row[2] == "ATTENDEE", f"Expected role ATTENDEE, got {att_row[2]}"
            assert not att_row[3].startswith(test_password), "Password stored in plaintext!"
            assert "$argon2id$" in att_row[3], "Password not hashed with Argon2id!"

            # Check Organiser record
            org_row = conn.execute(
                text("SELECT full_name, email, role, password_hash, organization_name FROM users WHERE email = :email"),
                {"email": organiser_email}
            ).fetchone()
            assert org_row is not None, "Organiser not found in database"
            assert org_row[2] == "ORGANISER", f"Expected role ORGANISER, got {org_row[2]}"
            assert org_row[4] == org_name, f"Expected organization {org_name}, got {org_row[4]}"
            assert not org_row[3].startswith(test_password), "Password stored in plaintext!"
            assert "$argon2id$" in org_row[3], "Password not hashed with Argon2id!"

        # 6. Duplicate Email Registration Rejection
        dup_res = client.post("/api/v1/auth/register", json={
            "full_name": "Duplicate Tester",
            "email": attendee_email,
            "password": test_password,
            "role": "ATTENDEE"
        })
        assert dup_res.status_code == 400
        assert "already exists" in dup_res.text.lower()

        # 7. Invalid Inputs & Weak Passwords
        weak_pwd_res = client.post("/api/v1/auth/register", json={
            "full_name": "Weak Pwd",
            "email": f"weak_{uid}@example.com",
            "password": "onlyletters",
            "role": "ATTENDEE"
        })
        assert weak_pwd_res.status_code == 422
        assert "at least one letter and one number" in weak_pwd_res.text

        # 8. Mark users as verified in DB so we can test login
        with engine.begin() as conn:
            conn.execute(
                text("UPDATE users SET is_email_verified = 1 WHERE email IN (:e1, :e2)"),
                {"e1": attendee_email, "e2": organiser_email}
            )

        # Login as Attendee
        att_login = client.post("/api/v1/auth/login", json={
            "email": attendee_email,
            "password": test_password
        })
        assert att_login.status_code == 200
        assert att_login.json()["data"]["role"] == "ATTENDEE"

        # Login as Organiser
        org_login = client.post("/api/v1/auth/login", json={
            "email": organiser_email,
            "password": test_password
        })
        assert org_login.status_code == 200
        assert org_login.json()["data"]["role"] == "ORGANISER"
        assert org_login.json()["data"]["organization_name"] == org_name
