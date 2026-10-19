import os
import sys
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure service directory is on path
SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from app.models.user import User
from app.models.email_otp import EmailOTP

DATABASE_URL = os.getenv(
    "AUTH_DATABASE_URL",
    "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_auth_db"
)


def test_auth_db_connection_and_user_creation():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    test_email = f"schema_tester_{datetime.now(timezone.utc).timestamp()}@example.com"
    user = User(
        full_name="Schema Tester",
        email=test_email,
        password_hash="argon2id$mock_hash_for_testing",
        role="CUSTOMER",
        is_email_verified=False
    )
    session.add(user)
    session.commit()
    assert user.id is not None
    assert user.email == test_email
    assert user.role == "CUSTOMER"

    # Test OTP association
    otp = EmailOTP(
        user_id=user.id,
        purpose="VERIFY_EMAIL",
        otp_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    session.add(otp)
    session.commit()
    assert otp.id is not None
    assert otp.attempts == 0

    # Clean up test user (cascades to otp)
    session.delete(user)
    session.commit()
    session.close()
