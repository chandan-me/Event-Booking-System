from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar, Optional, List
from pydantic import BaseModel, Field, model_validator
import re

T = TypeVar("T")


class StandardResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: str = "Operation completed successfully"


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Category Schemas ---
class EventCategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: Optional[str] = None


class EventCategoryResponse(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True


# --- Event Schemas ---
class EventCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    category_id: int = Field(..., gt=0)
    venue_name: str = Field(..., min_length=2, max_length=255)
    venue_address: str = Field(..., min_length=5, max_length=255)
    start_at: datetime
    end_at: datetime
    price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), max_digits=10, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    total_capacity: int = Field(..., gt=0, description="Total tickets available for this event")
    status: str = Field(default="DRAFT", pattern="^(DRAFT|PUBLISHED|CANCELLED|COMPLETED)$")

    @model_validator(mode="after")
    def validate_event_dates(self):
        if self.end_at <= self.start_at:
            raise ValueError("Event end date must be strictly after the start date")
        return self


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    category_id: Optional[int] = Field(None, gt=0)
    venue_name: Optional[str] = Field(None, min_length=2, max_length=255)
    venue_address: Optional[str] = Field(None, min_length=5, max_length=255)
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    price: Optional[Decimal] = Field(None, ge=Decimal("0.00"), max_digits=10, decimal_places=2)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    total_capacity: Optional[int] = Field(None, gt=0)
    status: Optional[str] = Field(None, pattern="^(DRAFT|PUBLISHED|CANCELLED|COMPLETED)$")

    @model_validator(mode="after")
    def validate_dates_if_both_provided(self):
        if self.start_at and self.end_at and self.end_at <= self.start_at:
            raise ValueError("Event end date must be strictly after the start date")
        return self


class EventResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    category_id: int
    category_name: Optional[str] = None
    venue_name: str
    venue_address: str
    start_at: datetime
    end_at: datetime
    price: Decimal
    currency: str
    total_capacity: int
    available_capacity: int
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Inventory Reservation Schemas ---
class InventoryReservationRequest(BaseModel):
    quantity: int = Field(..., gt=0, le=50, description="Quantity of tickets to reserve atomically")
    reservation_id: str = Field(..., min_length=8, max_length=64, description="Unique reservation/order identifier")


class InventoryReservationResponse(BaseModel):
    event_id: int
    reserved_quantity: int
    remaining_capacity: int
    reservation_id: str
    status: str = "RESERVED"


class InventoryReleaseRequest(BaseModel):
    quantity: int = Field(..., gt=0, description="Quantity of tickets to return back to inventory")
    reservation_id: str = Field(..., min_length=8, max_length=64, description="Unique reservation identifier")


class InventoryReleaseResponse(BaseModel):
    event_id: int
    released_quantity: int
    remaining_capacity: int
    reservation_id: str
    status: str = "RELEASED"
