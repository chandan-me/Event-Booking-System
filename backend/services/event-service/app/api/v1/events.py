from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session

from app.schemas.event import (
    EventCreate, EventUpdate, EventResponse, EventCategoryCreate,
    EventCategoryResponse, PaginatedResponse, StandardResponse,
    InventoryReservationRequest, InventoryReservationResponse,
    InventoryReleaseRequest, InventoryReleaseResponse,
    OrganizerAddSeatsRequest
)
from app.api.deps import (
    get_db, get_event_service, require_admin, require_organizer_or_admin, verify_internal_access
)
from app.services.event_service import EventService

router = APIRouter(prefix="/api/v1", tags=["Events & Catalog"])


# --- Category Endpoints ---
@router.get(
    "/categories",
    response_model=StandardResponse[List[EventCategoryResponse]],
    summary="List all event categories (Public)"
)
def list_categories(
    db: Session = Depends(get_db),
    event_service: EventService = Depends(get_event_service)
):
    categories = event_service.list_categories(db)
    return StandardResponse(success=True, data=categories, message="Categories retrieved successfully")


@router.post(
    "/categories",
    response_model=StandardResponse[EventCategoryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new event category (Admin)"
)
def create_category(
    cat_in: EventCategoryCreate,
    db: Session = Depends(get_db),
    admin_id: int = Depends(require_admin),
    event_service: EventService = Depends(get_event_service)
):
    category = event_service.create_category(db, cat_in)
    return StandardResponse(success=True, data=category, message="Category created successfully")


# --- Event Endpoints ---
@router.get(
    "/events",
    response_model=StandardResponse[PaginatedResponse[EventResponse]],
    summary="Browse and filter events with pagination (Public)"
)
def list_events(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by title, description or venue"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    status: Optional[str] = Query("PUBLISHED", description="Filter by event status (default: PUBLISHED)"),
    min_price: Optional[Decimal] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[Decimal] = Query(None, ge=0, description="Maximum price filter"),
    start_from: Optional[datetime] = Query(None, description="Filter events starting on or after date"),
    db: Session = Depends(get_db),
    event_service: EventService = Depends(get_event_service)
):
    paginated = event_service.list_events(
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
    return StandardResponse(success=True, data=paginated, message="Events retrieved successfully")


@router.get(
    "/events/{event_id}",
    response_model=StandardResponse[EventResponse],
    summary="Get detailed event by ID (Public)"
)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    event_service: EventService = Depends(get_event_service)
):
    event = event_service.get_event_by_id(db, event_id)
    return StandardResponse(success=True, data=event, message="Event details retrieved successfully")


@router.post(
    "/events",
    response_model=StandardResponse[EventResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new event (Organizer or Admin)"
)
def create_event(
    event_in: EventCreate,
    db: Session = Depends(get_db),
    user_ctx: dict = Depends(require_organizer_or_admin),
    event_service: EventService = Depends(get_event_service)
):
    event = event_service.create_event(db, admin_id=user_ctx["user_id"], event_in=event_in)
    return StandardResponse(success=True, data=event, message="Event created successfully")


@router.patch(
    "/events/{event_id}",
    response_model=StandardResponse[EventResponse],
    summary="Update event details or capacity (Organizer or Admin)"
)
def update_event(
    event_id: int,
    event_in: EventUpdate,
    db: Session = Depends(get_db),
    user_ctx: dict = Depends(require_organizer_or_admin),
    event_service: EventService = Depends(get_event_service)
):
    event = event_service.get_event_by_id(db, event_id)
    if user_ctx["role"] in ("ORGANIZER", "ORGANISER") and event.created_by != user_ctx["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this event.")
    updated = event_service.update_event(db, event_id=event_id, event_in=event_in)
    return StandardResponse(success=True, data=updated, message="Event updated successfully")


@router.delete(
    "/events/{event_id}",
    response_model=StandardResponse[EventResponse],
    summary="Cancel or unpublish event (Organizer or Admin)"
)
def cancel_event(
    event_id: int,
    db: Session = Depends(get_db),
    user_ctx: dict = Depends(require_organizer_or_admin),
    event_service: EventService = Depends(get_event_service)
):
    event = event_service.get_event_by_id(db, event_id)
    if user_ctx["role"] in ("ORGANIZER", "ORGANISER") and event.created_by != user_ctx["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this event.")
    cancelled = event_service.cancel_event(db, event_id=event_id)
    return StandardResponse(success=True, data=cancelled, message="Event cancelled successfully")


# --- Organizer Specific Endpoints ---
@router.get(
    "/organizer/events",
    response_model=StandardResponse[List[EventResponse]],
    summary="List events hosted by current organizer"
)
def list_my_hosted_events(
    db: Session = Depends(get_db),
    user_ctx: dict = Depends(require_organizer_or_admin),
    event_service: EventService = Depends(get_event_service)
):
    is_admin = user_ctx["role"] == "ADMIN"
    events = event_service.list_organizer_events(db, organizer_id=user_ctx["user_id"], is_admin=is_admin)
    return StandardResponse(success=True, data=events, message="Hosted events retrieved successfully")


@router.post(
    "/organizer/events/{event_id}/add-seats",
    response_model=StandardResponse[EventResponse],
    summary="Add capacity / extra seats to an event"
)
def add_seats_to_event(
    event_id: int,
    req: OrganizerAddSeatsRequest,
    db: Session = Depends(get_db),
    user_ctx: dict = Depends(require_organizer_or_admin),
    event_service: EventService = Depends(get_event_service)
):
    is_admin = user_ctx["role"] == "ADMIN"
    updated = event_service.add_seats(
        db=db,
        event_id=event_id,
        organizer_id=user_ctx["user_id"],
        additional_capacity=req.additional_capacity,
        is_admin=is_admin
    )
    return StandardResponse(
        success=True,
        data=updated,
        message=f"Added {req.additional_capacity} seats successfully."
    )


# --- Internal Service Endpoints (For Booking Service) ---
@router.post(
    "/internal/events/{event_id}/reserve",
    response_model=StandardResponse[InventoryReservationResponse],
    status_code=status.HTTP_200_OK,
    summary="Atomically reserve ticket capacity (Internal Service)",
    dependencies=[Depends(verify_internal_access)]
)
def reserve_inventory(
    event_id: int,
    req: InventoryReservationRequest,
    db: Session = Depends(get_db),
    event_service: EventService = Depends(get_event_service)
):
    res = event_service.reserve_inventory(
        db=db,
        event_id=event_id,
        quantity=req.quantity,
        reservation_id=req.reservation_id
    )
    return StandardResponse(
        success=True,
        data=res,
        message=f"Successfully reserved {req.quantity} ticket(s)"
    )


@router.post(
    "/internal/events/{event_id}/release",
    response_model=StandardResponse[InventoryReleaseResponse],
    status_code=status.HTTP_200_OK,
    summary="Release reserved ticket capacity compensation (Internal Service)",
    dependencies=[Depends(verify_internal_access)]
)
def release_inventory(
    event_id: int,
    req: InventoryReleaseRequest,
    db: Session = Depends(get_db),
    event_service: EventService = Depends(get_event_service)
):
    res = event_service.release_inventory(
        db=db,
        event_id=event_id,
        quantity=req.quantity,
        reservation_id=req.reservation_id
    )
    return StandardResponse(
        success=True,
        data=res,
        message=f"Successfully released {req.quantity} ticket(s) back to inventory"
    )


@router.get(
    "/internal/organizers/{organizer_id}/event-ids",
    response_model=StandardResponse[List[int]],
    summary="Internal: Get event IDs created by an organizer",
    dependencies=[Depends(verify_internal_access)]
)
def get_organizer_event_ids(
    organizer_id: int,
    db: Session = Depends(get_db),
    event_service: EventService = Depends(get_event_service)
):
    events = event_service.list_organizer_events(db, organizer_id=organizer_id, is_admin=False)
    ids = [e.id for e in events]
    return StandardResponse(success=True, data=ids, message="Organizer event IDs retrieved")

