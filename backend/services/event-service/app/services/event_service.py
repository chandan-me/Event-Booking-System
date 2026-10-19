import math
import re
from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.event_repository import EventRepository
from app.models.category import EventCategory
from app.models.event import Event
from app.schemas.event import (
    EventCreate, EventUpdate, EventResponse, EventCategoryCreate,
    EventCategoryResponse, PaginatedResponse, InventoryReservationResponse,
    InventoryReleaseResponse
)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_-]+", "-", text).strip("-")


class EventService:
    def __init__(self, event_repo: Optional[EventRepository] = None):
        self.event_repo = event_repo or EventRepository()

    # --- Categories ---
    def list_categories(self, db: Session) -> List[EventCategoryResponse]:
        categories = self.event_repo.list_categories(db)
        return [EventCategoryResponse.model_validate(c) for c in categories]

    def create_category(self, db: Session, cat_in: EventCategoryCreate) -> EventCategoryResponse:
        slug = cat_in.slug or slugify(cat_in.name)
        existing = self.event_repo.get_category_by_slug(db, slug)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with slug '{slug}' already exists."
            )
        category = self.event_repo.create_category(db, name=cat_in.name, slug=slug)
        return EventCategoryResponse.model_validate(category)

    # --- Event Queries ---
    def list_events(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        status: Optional[str] = "PUBLISHED",
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        start_from: Optional[str] = None
    ) -> PaginatedResponse[EventResponse]:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        events, total = self.event_repo.list_events(
            db=db,
            page=page,
            page_size=page_size,
            search=search,
            category_id=category_id,
            status=status,
            min_price=min_price,
            max_price=max_price,
            start_from=start_from
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 1
        items = []
        for e in events:
            resp = EventResponse.model_validate(e)
            if e.category:
                resp.category_name = e.category.name
            items.append(resp)

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def get_event_by_id(self, db: Session, event_id: int) -> EventResponse:
        event = self.event_repo.get_event_by_id(db, event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
        resp = EventResponse.model_validate(event)
        if event.category:
            resp.category_name = event.category.name
        return resp

    # --- Event Management (Admin) ---
    def create_event(self, db: Session, admin_id: int, event_in: EventCreate) -> EventResponse:
        category = self.event_repo.get_category_by_id(db, event_in.category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")

        base_slug = slugify(event_in.title)
        slug = base_slug
        counter = 1
        while self.event_repo.get_event_by_slug(db, slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        event_data = event_in.model_dump()
        event_data["slug"] = slug
        event_data["available_capacity"] = event_in.total_capacity
        event_data["created_by"] = admin_id

        event = self.event_repo.create_event(db, event_data)
        resp = EventResponse.model_validate(event)
        resp.category_name = category.name
        return resp

    def update_event(self, db: Session, event_id: int, event_in: EventUpdate) -> EventResponse:
        event = self.event_repo.get_event_by_id(db, event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

        update_data = event_in.model_dump(exclude_unset=True)

        # Capacity update check
        if "total_capacity" in update_data and update_data["total_capacity"] is not None:
            new_total = update_data["total_capacity"]
            reserved_so_far = event.total_capacity - event.available_capacity
            if new_total < reserved_so_far:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot reduce capacity below currently reserved tickets ({reserved_so_far})."
                )
            update_data["available_capacity"] = new_total - reserved_so_far

        updated = self.event_repo.update_event(db, event, update_data)
        return EventResponse.model_validate(updated)

    def cancel_event(self, db: Session, event_id: int) -> EventResponse:
        event = self.event_repo.get_event_by_id(db, event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
        cancelled = self.event_repo.cancel_event(db, event)
        return EventResponse.model_validate(cancelled)

    # --- Atomic Inventory Reservation & Release ---
    def reserve_inventory(self, db: Session, event_id: int, quantity: int, reservation_id: str) -> InventoryReservationResponse:
        event = self.event_repo.get_event_by_id(db, event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

        if event.status != "PUBLISHED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot book tickets for an event in '{event.status}' status."
            )

        success = self.event_repo.reserve_capacity_atomic(db, event_id, quantity)
        if not success:
            # Re-read to provide precise diagnostic error
            db.refresh(event)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Insufficient tickets available. Only {event.available_capacity} tickets remaining."
            )

        db.refresh(event)
        return InventoryReservationResponse(
            event_id=event_id,
            reserved_quantity=quantity,
            remaining_capacity=event.available_capacity,
            reservation_id=reservation_id,
            status="RESERVED"
        )

    def release_inventory(self, db: Session, event_id: int, quantity: int, reservation_id: str) -> InventoryReleaseResponse:
        event = self.event_repo.get_event_by_id(db, event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

        self.event_repo.release_capacity_atomic(db, event_id, quantity)
        db.refresh(event)
        return InventoryReleaseResponse(
            event_id=event_id,
            released_quantity=quantity,
            remaining_capacity=event.available_capacity,
            reservation_id=reservation_id,
            status="RELEASED"
        )

    def list_organizer_events(self, db: Session, organizer_id: int, is_admin: bool = False) -> List[EventResponse]:
        events = self.event_repo.list_events_by_organizer(db, organizer_id=organizer_id, is_admin=is_admin)
        res = []
        for e in events:
            er = EventResponse.model_validate(e)
            if e.category:
                er.category_name = e.category.name
            res.append(er)
        return res

    def add_seats(self, db: Session, event_id: int, organizer_id: int, additional_capacity: int, is_admin: bool = False) -> EventResponse:
        event = self.event_repo.get_event_by_id(db, event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
        if not is_admin and event.created_by != organizer_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this event.")

        self.event_repo.add_capacity_atomic(db, event_id, additional_capacity)
        db.refresh(event)
        er = EventResponse.model_validate(event)
        if event.category:
            er.category_name = event.category.name
        return er

