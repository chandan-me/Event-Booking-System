from sqlalchemy import Column, BigInteger, String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from .base import Base, utc_now


class EmailOTP(Base):
    __tablename__ = "email_otps"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    purpose = Column(String(50), nullable=False)  # 'VERIFY_EMAIL', 'PASSWORD_RESET'
    otp_hash = Column(String(64), nullable=False)  # SHA-256 hash
    attempts = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

    user = relationship("User", back_populates="otps")

    __table_args__ = (
        Index("idx_otps_user_purpose_expires", "user_id", "purpose", "expires_at"),
    )

    def __repr__(self):
        return f"<EmailOTP id={self.id} user_id={self.user_id} purpose={self.purpose}>"
