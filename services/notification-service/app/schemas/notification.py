from datetime import datetime
from typing import Generic, TypeVar, Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr

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


class NotificationEventMessage(BaseModel):
    message_id: str = Field(..., description="Unique message UUID for deduplication")
    event_type: str = Field(..., description="Event discriminator: VERIFY_EMAIL, BOOKING_CONFIRMATION, etc.")
    recipient: EmailStr = Field(..., description="Target email address")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Event data dictionary")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    retry_count: int = Field(default=0, ge=0)


class DirectNotificationRequest(BaseModel):
    event_type: str = Field(..., pattern="^(VERIFY_EMAIL|PASSWORD_RESET|BOOKING_CONFIRMATION|BOOKING_CANCELLATION)$")
    recipient: EmailStr
    payload: Dict[str, Any] = Field(default_factory=dict)


class NotificationRecordResponse(BaseModel):
    id: int
    event_type: str
    recipient: str
    status: str
    attempts: int
    last_error: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True
