import os
import sys
import pytest
from datetime import datetime, timezone
from starlette.testclient import TestClient

SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from app.main import app
from app.api.deps import get_email_service
from app.services.email_service import FakeEmailService

# Inject FakeEmailService for isolated automated testing
fake_email_service = FakeEmailService()
app.dependency_overrides[get_email_service] = lambda: fake_email_service

client = TestClient(app)


def test_health_and_readiness_probes():
    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "healthy"

    r_ready = client.get("/health/ready")
    assert r_ready.status_code == 200
    assert r_ready.json()["status"] == "ready"


def test_full_registration_and_otp_verification_flow():
    unique_suffix = int(datetime.now(timezone.utc).timestamp() * 1000)
    test_email = f"user_{unique_suffix}@example.com"
    test_password = "SecurePassword123!"

    # 1. Register Account
    reg_payload = {
        "full_name": "Alice Customer",
        "email": test_email,
        "password": test_password
    }
    r_reg = client.post("/api/v1/auth/register", json=reg_payload)
    assert r_reg.status_code == 201
    data = r_reg.json()
    assert data["success"] is True
    assert data["data"]["email"] == test_email
    assert data["data"]["role"] == "CUSTOMER"
    assert data["data"]["is_email_verified"] is False

    # Verify an OTP email was intercepted by fake_email_service
    otp = fake_email_service.get_last_otp(test_email)
    assert otp is not None
    assert len(otp) == 6

    # 2. Duplicate registration attempt should be rejected
    r_dup = client.post("/api/v1/auth/register", json=reg_payload)
    assert r_dup.status_code == 400
    assert "already exists" in r_dup.json()["error"]["message"]

    # 3. Login before verification should be forbidden
    r_login_unverified = client.post("/api/v1/auth/login", json={"email": test_email, "password": test_password})
    assert r_login_unverified.status_code == 403
    assert "verify your email" in r_login_unverified.json()["error"]["message"].lower()

    # 4. Verify with invalid OTP should fail
    r_verify_bad = client.post("/api/v1/auth/verify-email", json={"email": test_email, "otp": "000000"})
    assert r_verify_bad.status_code == 400
    assert "attempt(s) remaining" in r_verify_bad.json()["error"]["message"].lower()

    # 5. Verify with correct OTP
    r_verify_good = client.post("/api/v1/auth/verify-email", json={"email": test_email, "otp": otp})
    assert r_verify_good.status_code == 200
    assert r_verify_good.json()["success"] is True

    # 6. Login now succeeds
    r_login = client.post("/api/v1/auth/login", json={"email": test_email, "password": test_password})
    assert r_login.status_code == 200
    login_data = r_login.json()["data"]
    access_token = login_data["access_token"]
    refresh_token = login_data["refresh_token"]
    assert access_token is not None
    assert refresh_token is not None

    # 7. Access protected /me endpoint with Bearer access token
    headers = {"Authorization": f"Bearer {access_token}"}
    r_me = client.get("/api/v1/auth/me", headers=headers)
    assert r_me.status_code == 200
    assert r_me.json()["data"]["email"] == test_email
    assert r_me.json()["data"]["is_email_verified"] is True

    # 8. Refresh Token Rotation
    r_refresh = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r_refresh.status_code == 200
    rotated_data = r_refresh.json()["data"]
    new_access_token = rotated_data["access_token"]
    new_refresh_token = rotated_data["refresh_token"]
    assert new_refresh_token != refresh_token

    # 9. Token Reuse Detection: Submitting the OLD refresh token must trigger compromise detection
    r_reuse = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r_reuse.status_code == 401
    assert "suspicious" in r_reuse.json()["error"]["message"].lower()

    # 10. Logout with new token
    r_logout = client.post("/api/v1/auth/logout", json={"refresh_token": new_refresh_token})
    assert r_logout.status_code == 200


def test_password_reset_flow():
    unique_suffix = int(datetime.now(timezone.utc).timestamp() * 1000)
    test_email = f"reset_user_{unique_suffix}@example.com"
    old_password = "InitialPassword123!"
    new_password = "BrandNewPassword456!"

    # Register & verify
    client.post("/api/v1/auth/register", json={
        "full_name": "Reset Tester",
        "email": test_email,
        "password": old_password
    })
    otp_reg = fake_email_service.get_last_otp(test_email)
    client.post("/api/v1/auth/verify-email", json={"email": test_email, "otp": otp_reg})

    # Request password reset code
    r_forgot = client.post("/api/v1/auth/forgot-password", json={"email": test_email})
    assert r_forgot.status_code == 200
    reset_otp = fake_email_service.get_last_otp(test_email)
    assert reset_otp is not None

    # Reset password with OTP
    r_reset = client.post("/api/v1/auth/reset-password", json={
        "email": test_email,
        "otp": reset_otp,
        "new_password": new_password
    })
    assert r_reset.status_code == 200

    # Old password no longer works
    r_old_login = client.post("/api/v1/auth/login", json={"email": test_email, "password": old_password})
    assert r_old_login.status_code == 401

    # New password logs in successfully
    r_new_login = client.post("/api/v1/auth/login", json={"email": test_email, "password": new_password})
    assert r_new_login.status_code == 200
    assert r_new_login.json()["data"]["email"] == test_email


def test_privilege_escalation_rejection():
    # Public registration must reject role: "ADMIN"
    bad_payload = {
        "full_name": "Attacker",
        "email": "hacker@example.com",
        "password": "Password123!",
        "role": "ADMIN"
    }
    r = client.post("/api/v1/auth/register", json=bad_payload)
    assert r.status_code == 422
    assert "forbidden" in str(r.json()).lower()
