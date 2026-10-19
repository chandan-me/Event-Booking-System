import os
import sys
import pytest
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from app.models.booking import Booking
from app.models.status_history import BookingStatusHistory

DATABASE_URL = os.getenv(
    "BOOKING_DATABASE_URL",
    "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_booking_db"
)


def test_booking_creation_and_status_history():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    idem_key = f"idem-{datetime.now(timezone.utc).timestamp()}"
    ref = f"BK-{int(datetime.now(timezone.utc).timestamp())}"
    booking = Booking(
        booking_reference=ref,
        customer_id=101,
        event_id=202,
        quantity=3,
        unit_price_snapshot=Decimal("45.00"),
        total_amount_snapshot=Decimal("135.00"),
        currency="USD",
        status="CONFIRMED",
        idempotency_key=idem_key
    )
    session.add(booking)
    session.commit()
    assert booking.id is not None
    assert booking.booking_reference == ref

    history = BookingStatusHistory(
        booking_id=booking.id,
        previous_status=None,
        new_status="CONFIRMED",
        reason="Initial booking creation"
    )
    session.add(history)
    session.commit()
    assert history.id is not None

    # Clean up
    session.delete(booking)
    session.commit()
    session.close()


def test_booking_idempotency_key_unique_constraint():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    idem_key = f"idem-duplicate-{datetime.now(timezone.utc).timestamp()}"
    booking1 = Booking(
        booking_reference=f"BK-{int(datetime.now(timezone.utc).timestamp())}-1",
        customer_id=101,
        event_id=202,
        quantity=1,
        unit_price_snapshot=Decimal("10.00"),
        total_amount_snapshot=Decimal("10.00"),
        currency="USD",
        status="CONFIRMED",
        idempotency_key=idem_key
    )
    session.add(booking1)
    session.commit()

    # Attempt to insert identical idempotency key -> Must violate UNIQUE constraint
    booking2 = Booking(
        booking_reference=f"BK-{int(datetime.now(timezone.utc).timestamp())}-2",
        customer_id=101,
        event_id=202,
        quantity=1,
        unit_price_snapshot=Decimal("10.00"),
        total_amount_snapshot=Decimal("10.00"),
        currency="USD",
        status="CONFIRMED",
        idempotency_key=idem_key  # Duplicate key!
    )
    session.add(booking2)
    with pytest.raises(IntegrityError):
        session.commit()

    session.rollback()
    session.delete(booking1)
    session.commit()
    session.close()
