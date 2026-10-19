from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel, Field

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


class BookingCreateRequest(BaseModel):
    event_id: int = Field(..., gt=0, description="Target event ID")
    quantity: int = Field(..., gt=0, le=5, description="Number of tickets to book (maximum 5 per user/email)")
    idempotency_key: Optional[str] = Field(None, min_length=16, max_length=64, description="Unique client key preventing duplicate purchases")
    razorpay_order_id: Optional[str] = Field(None, description="Razorpay Order ID")
    razorpay_payment_id: Optional[str] = Field(None, description="Razorpay Payment ID")
    razorpay_signature: Optional[str] = Field(None, description="Razorpay Payment Verification Signature")
    customer_email: Optional[str] = Field(None, description="Customer attendee email for ticket dispatch")
    customer_name: Optional[str] = Field(None, description="Customer attendee display name")


class RazorpayOrderCreateRequest(BaseModel):
    event_id: int = Field(..., gt=0, description="Target event ID")
    quantity: int = Field(..., gt=0, le=5, description="Number of tickets to book (maximum 5)")
    customer_email: Optional[str] = Field(None, description="Customer email for policy limit validation")


class WaitingListCreateRequest(BaseModel):
    event_id: int = Field(..., gt=0, description="Target event ID")
    customer_email: str = Field(..., min_length=3, max_length=255, description="Customer email for notification")
    customer_name: Optional[str] = Field(None, max_length=255, description="Customer display name")
    quantity: int = Field(1, gt=0, le=5, description="Desired tickets (1-5)")
    preferred_tier: Optional[str] = Field("General Admission", max_length=100, description="Preferred ticket tier")
    notes: Optional[str] = Field(None, max_length=500, description="Special requests or attendee notes")


class WaitingListResponse(BaseModel):
    id: int
    event_id: int
    customer_id: int
    customer_email: str
    customer_name: Optional[str] = None
    quantity: int = 1
    preferred_tier: Optional[str] = "General Admission"
    notes: Optional[str] = None
    status: str = "WAITING"
    queue_position: Optional[int] = 1
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WaitingListStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="New status: WAITING, NOTIFIED, CONVERTED, CANCELLED")


class RazorpayOrderResponse(BaseModel):
    order_id: str
    amount: int  # Amount in paise (1 INR = 100 paise)
    currency: str = "INR"
    key_id: str
    event_title: str
    unit_price: Decimal
    total_amount: Decimal


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    booking_id: Optional[int] = None


class BookingCancelRequest(BaseModel):
    reason: Optional[str] = Field("Customer initiated cancellation", max_length=255)


class BookingStatusHistoryResponse(BaseModel):
    id: int
    previous_status: Optional[str]
    new_status: str
    reason: Optional[str]
    changed_at: datetime

    class Config:
        from_attributes = True


from app.schemas.ticket import TicketResponse

class BookingResponse(BaseModel):
    id: int
    booking_reference: str
    customer_id: int
    event_id: int
    quantity: int
    unit_price_snapshot: Decimal
    total_amount_snapshot: Decimal
    currency: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    payment_status: Optional[str] = "PAID"
    status: str
    idempotency_key: str
    created_at: datetime
    cancelled_at: Optional[datetime] = None
    tickets: List[TicketResponse] = []

    class Config:
        from_attributes = True


class BookingDetailResponse(BookingResponse):
    status_history: List[BookingStatusHistoryResponse] = []


class AttendeeItemResponse(BaseModel):
    booking_id: int
    booking_reference: str
    ticket_id: Optional[int] = None
    ticket_reference: Optional[str] = None
    customer_id: int
    customer_name: Optional[str] = "Attendee"
    customer_email: Optional[str] = None
    event_id: int
    quantity: int
    unit_price: Decimal
    total_amount: Decimal
    currency: str = "INR"
    status: str
    payment_status: str
    seat_tier: str = "General Admission"
    add_ons: List[str] = []
    qr_code_token: str
    qr_code_image_base64: Optional[str] = None
    email_delivered: bool = True
    checked_in: bool = False
    checked_in_at: Optional[datetime] = None
    checked_in_by: Optional[str] = None
    booked_at: datetime


class OrganizerAnalyticsResponse(BaseModel):
    total_revenue: Decimal
    total_tickets_sold: int
    total_bookings: int
    confirmed_bookings: int
    cancelled_bookings: int
    emails_delivered: int
    qr_codes_generated: int
    check_in_count: int
    gross_revenue: Optional[Decimal] = None
    total_emails_sent: Optional[int] = None
    total_qrs_generated: Optional[int] = None
    total_checked_in: Optional[int] = None


