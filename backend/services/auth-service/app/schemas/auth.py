from datetime import datetime
from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

T = TypeVar("T")


class StandardResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: str = "Operation completed successfully"


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="User full name")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=100, description="Minimum 8 characters with letters and numbers")
    role: Optional[str] = None
    organization_name: Optional[str] = Field(None, max_length=150, description="Organization or Host name")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain at least one letter and one number")
        return v

    @field_validator("role")
    @classmethod
    def validate_allowed_role(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return "CUSTOMER"
        v_upper = v.strip().upper()
        if v_upper in ("ADMIN", "SUPER_ADMIN"):
            raise ValueError("Administrator registration is forbidden through the public endpoint")
        if v_upper in ("ATTENDEE", "CUSTOMER"):
            return "ATTENDEE" if v_upper == "ATTENDEE" else "CUSTOMER"
        if v_upper in ("ORGANISER", "ORGANIZER", "HOST"):
            return "ORGANISER" if v_upper == "ORGANISER" else "ORGANIZER"
        raise ValueError(f"Invalid role: '{v}'. Public registration only permits ATTENDEE or ORGANISER.")


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ResendOtpRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)
    totp_code: Optional[str] = Field(None, max_length=9, description="Optional 6-digit TOTP or backup code")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    refresh_token: str
    user_id: int
    role: str
    email: str
    full_name: str
    organization_name: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10)


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain at least one letter and one number")
        return v


class MFASetupResponse(BaseModel):
    secret: str
    provisioning_uri: str
    backup_codes: list[str]


class MFAVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=9, description="6-digit TOTP code or backup code")


class MFADisableRequest(BaseModel):
    password: str
    code: str = Field(..., min_length=6, max_length=9)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    organization_name: Optional[str] = None
    is_email_verified: bool
    is_active: bool
    mfa_enabled: bool = False
    created_at: datetime

    @field_validator("is_email_verified", "is_active", "mfa_enabled", mode="before")
    @classmethod
    def coerce_bit_to_bool(cls, v: Any) -> bool:
        if v is None:
            return False
        if isinstance(v, (bytes, bytearray)):
            return v != b'\x00' and v != b'\x00'*len(v) and int.from_bytes(v, 'big') != 0
        if isinstance(v, (int, float)):
            return bool(v)
        return bool(v)

    class Config:
        from_attributes = True
