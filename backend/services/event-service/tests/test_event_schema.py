import os
import sys
import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError, OperationalError

SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from app.models.category import EventCategory
from app.models.event import Event

DATABASE_URL = os.getenv(
    "EVENT_DATABASE_URL",
    "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_catalog_db"
)


def test_event_category_and_valid_event_creation():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    slug = f"music-{datetime.now(timezone.utc).timestamp()}"
    cat = EventCategory(name=f"Music Concerts {datetime.now(timezone.utc).timestamp()}", slug=slug)
    session.add(cat)
    session.commit()
    assert cat.id is not None

    event = Event(
        title="Symphony Night",
        slug=f"symphony-{datetime.now(timezone.utc).timestamp()}",
        description="Classical music performance",
        category_id=cat.id,
        venue_name="Grand Hall",
        venue_address="100 Melody Lane",
        start_at=datetime.now(timezone.utc) + timedelta(days=7),
        end_at=datetime.now(timezone.utc) + timedelta(days=7, hours=3),
        price=Decimal("85.50"),
        currency="USD",
        total_capacity=500,
        available_capacity=500,
        status="PUBLISHED",
        created_by=1
    )
    session.add(event)
    session.commit()
    assert event.id is not None
    assert event.price == Decimal("85.50")
    assert event.available_capacity == 500

    # Clean up
    session.delete(event)
    session.delete(cat)
    session.commit()
    session.close()


def test_event_negative_capacity_check_constraint_failure():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    slug = f"cat-constraint-{datetime.now(timezone.utc).timestamp()}"
    cat = EventCategory(name=f"Category {datetime.now(timezone.utc).timestamp()}", slug=slug)
    session.add(cat)
    session.commit()

    # Attempt to insert event with negative available_capacity -> Must fail check constraint
    invalid_event = Event(
        title="Invalid Capacity Event",
        slug=f"invalid-cap-{datetime.now(timezone.utc).timestamp()}",
        description="Testing constraints",
        category_id=cat.id,
        venue_name="Small Room",
        venue_address="123 Nowhere",
        start_at=datetime.now(timezone.utc),
        end_at=datetime.now(timezone.utc) + timedelta(hours=2),
        price=Decimal("10.00"),
        currency="USD",
        total_capacity=100,
        available_capacity=-1,  # INVALID!
        status="DRAFT",
        created_by=1
    )
    session.add(invalid_event)
    with pytest.raises((IntegrityError, OperationalError)):
        session.commit()

    session.rollback()
    session.delete(cat)
    session.commit()
    session.close()
