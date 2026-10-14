from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar, Optional, List
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
    quantity: int = Field(..., gt=0, le=10, description="Number of tickets to book (1-10)")
    idempotency_key: Optional[str] = Field(None, min_length=16, max_length=64, description="Unique client key preventing duplicate purchases")
    razorpay_order_id: Optional[str] = Field(None, description="Razorpay Order ID")
    razorpay_payment_id: Optional[str] = Field(None, description="Razorpay Payment ID")
    razorpay_signature: Optional[str] = Field(None, description="Razorpay Payment Verification Signature")


class RazorpayOrderCreateRequest(BaseModel):
    event_id: int = Field(..., gt=0, description="Target event ID")
    quantity: int = Field(..., gt=0, le=10, description="Number of tickets to book")


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

    class Config:
        from_attributes = True


class BookingDetailResponse(BookingResponse):
    status_history: List[BookingStatusHistoryResponse] = []
