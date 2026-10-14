import secrets
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from .base import Base, utc_now


def generate_random_id() -> int:
    """Generate random numeric ID (8 digits, strictly numbers)."""
    return secrets.randbelow(89999999) + 10000000


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, default=generate_random_id, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="CUSTOMER")
    is_email_verified = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    otps = relationship("EmailOTP", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"
