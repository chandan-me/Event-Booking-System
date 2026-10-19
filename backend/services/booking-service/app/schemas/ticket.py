from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    event_id: int
    customer_id: int
    ticket_reference: str
    seat_label: str = "General Admission"
    status: str = "ACTIVE"
    issued_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    checked_in_at: Optional[datetime] = None
    checked_in_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Dynamically enriched fields for UI
    qr_code_image_base64: Optional[str] = None
    qr_code_data_uri: Optional[str] = None
    qr_code_url: Optional[str] = None
    qr_payload: Optional[str] = None
    event_title: Optional[str] = None
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    start_at: Optional[str] = None
    end_at: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    booking_reference: Optional[str] = None


class CheckInVerifyRequest(BaseModel):
    ticket_reference: Optional[str] = Field(None, description="Human readable ticket reference code or booking reference")
    token: Optional[str] = Field(None, description="Cryptographic raw ticket verification token")
    qr_payload: Optional[str] = Field(None, description="Full string decoded from camera QR scanner")
    event_id: Optional[int] = Field(None, description="Event ID being managed at check-in portal")


class CheckInScanRequest(BaseModel):
    ticket_reference: Optional[str] = Field(None, description="Human readable ticket reference code or booking reference")
    token: Optional[str] = Field(None, description="Cryptographic raw ticket verification token")
    qr_payload: Optional[str] = Field(None, description="Full string decoded from camera QR scanner")
    event_id: Optional[int] = Field(None, description="Event ID being managed at check-in portal")
    staff_name: Optional[str] = Field(None, description="Identity/name of check-in staff performing scan")
    notes: Optional[str] = Field(None, description="Optional entry notes (e.g. Gate 2, VIP wristband issued)")


class CheckInResultResponse(BaseModel):
    valid: bool
    code: str
    message: str
    ticket_reference: Optional[str] = None
    event_id: Optional[int] = None
    event_title: Optional[str] = None
    seat_label: Optional[str] = None
    attendee_name: Optional[str] = None
    checked_in_at: Optional[datetime] = None
    checked_in_by: Optional[str] = None


class CheckInStatsResponse(BaseModel):
    event_id: int
    total_tickets: int
    checked_in_count: int
    remaining_count: int
    cancelled_count: int
    expired_count: int
    revoked_count: int
    check_in_rate_percentage: float
    check_in_rate_percent: Optional[float] = None


class ResendEmailResponse(BaseModel):
    ticket_id: Optional[int] = None
    booking_reference: str
    ticket_reference: Optional[str] = None
    delivered: bool
    recipient: str
    message: str


class PublicVerifyResponse(BaseModel):
    valid: bool
    status: str
    message: str
    ticket_reference: str
    event_title: Optional[str] = None
    seat_label: Optional[str] = None
