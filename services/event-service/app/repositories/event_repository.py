from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, update, func, or_, text
from app.models.category import EventCategory
from app.models.event import Event


class EventRepository:
    # --- Category Operations ---
    def get_category_by_id(self, db: Session, category_id: int) -> Optional[EventCategory]:
        return db.execute(select(EventCategory).where(EventCategory.id == category_id)).scalar_one_or_none()

    def get_category_by_slug(self, db: Session, slug: str) -> Optional[EventCategory]:
        return db.execute(select(EventCategory).where(EventCategory.slug == slug)).scalar_one_or_none()

    def list_categories(self, db: Session) -> List[EventCategory]:
        return list(db.execute(select(EventCategory).order_by(EventCategory.name.asc())).scalars().all())

    def create_category(self, db: Session, name: str, slug: str) -> EventCategory:
        category = EventCategory(name=name, slug=slug)
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    # --- Event CRUD Operations ---
    def get_event_by_id(self, db: Session, event_id: int) -> Optional[Event]:
        return db.execute(select(Event).where(Event.id == event_id)).scalar_one_or_none()

    def get_event_by_slug(self, db: Session, slug: str) -> Optional[Event]:
        return db.execute(select(Event).where(Event.slug == slug)).scalar_one_or_none()

    def list_events(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        status: Optional[str] = "PUBLISHED",
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        start_from: Optional[datetime] = None
    ) -> Tuple[List[Event], int]:
        query = select(Event)

        # Filters
        if status:
            query = query.where(Event.status == status)
        if category_id:
            query = query.where(Event.category_id == category_id)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Event.title.ilike(search_term),
                    Event.description.ilike(search_term),
                    Event.venue_name.ilike(search_term)
                )
            )
        if min_price is not None:
            query = query.where(Event.price >= min_price)
        if max_price is not None:
            query = query.where(Event.price <= max_price)
        if start_from is not None:
            query = query.where(Event.start_at >= start_from)

        # Count total matching rows
        count_query = select(func.count()).select_from(query.subquery())
        total = db.execute(count_query).scalar_one()

        # Ordering & Pagination
        offset = (page - 1) * page_size
        events = list(
            db.execute(
                query.order_by(Event.start_at.asc())
                .offset(offset)
                .limit(page_size)
            ).scalars().all()
        )

        return events, total

    def create_event(self, db: Session, event_data: dict) -> Event:
        event = Event(**event_data)
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    def update_event(self, db: Session, event: Event, update_data: dict) -> Event:
        for field, value in update_data.items():
            if value is not None:
                setattr(event, field, value)
        event.updated_at = datetime.now(timezone.utc)
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    def cancel_event(self, db: Session, event: Event) -> Event:
        event.status = "CANCELLED"
        event.updated_at = datetime.now(timezone.utc)
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    # --- Atomic Inventory Engine ---
    def reserve_capacity_atomic(self, db: Session, event_id: int, quantity: int) -> bool:
        """
        Atomically decrement available_capacity using conditional UPDATE.
        Safe against race conditions without distributed locks.
        Returns True if reservation succeeded, False if sold out or insufficient tickets.
        """
        now = datetime.now(timezone.utc)
        stmt = text(
            """
            UPDATE events
            SET available_capacity = available_capacity - :qty,
                updated_at = :now
            WHERE id = :event_id
              AND available_capacity >= :qty
              AND status = 'PUBLISHED'
            """
        )
        result = db.execute(stmt, {"qty": quantity, "event_id": event_id, "now": now})
        db.commit()
        return result.rowcount > 0

    def release_capacity_atomic(self, db: Session, event_id: int, quantity: int) -> bool:
        """
        Compensating transaction: return reserved tickets back to available_capacity.
        Enforces that available_capacity cannot exceed total_capacity.
        """
        now = datetime.now(timezone.utc)
        stmt = text(
            """
            UPDATE events
            SET available_capacity = LEAST(total_capacity, available_capacity + :qty),
                updated_at = :now
            WHERE id = :event_id
            """
        )
        result = db.execute(stmt, {"qty": quantity, "event_id": event_id, "now": now})
        db.commit()
        return result.rowcount > 0
