from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, update
from app.models.email_otp import EmailOTP


class OTPRepository:
    def create_otp(self, db: Session, user_id: int, purpose: str, otp_hash: str, expires_at: datetime) -> EmailOTP:
        # Invalidate existing active OTPs for the same purpose
        self.invalidate_previous_otps(db, user_id, purpose)

        otp_record = EmailOTP(
            user_id=user_id,
            purpose=purpose,
            otp_hash=otp_hash,
            attempts=0,
            expires_at=expires_at,
            consumed_at=None
        )
        db.add(otp_record)
        db.commit()
        db.refresh(otp_record)
        return otp_record

    def get_latest_active_otp(self, db: Session, user_id: int, purpose: str) -> EmailOTP | None:
        return db.execute(
            select(EmailOTP)
            .where(
                EmailOTP.user_id == user_id,
                EmailOTP.purpose == purpose,
                EmailOTP.consumed_at.is_(None)
            )
            .order_by(EmailOTP.created_at.desc())
        ).scalars().first()

    def increment_attempts(self, db: Session, otp: EmailOTP) -> EmailOTP:
        otp.attempts += 1
        db.add(otp)
        db.commit()
        db.refresh(otp)
        return otp

    def mark_consumed(self, db: Session, otp: EmailOTP) -> EmailOTP:
        otp.consumed_at = datetime.now(timezone.utc)
        db.add(otp)
        db.commit()
        db.refresh(otp)
        return otp

    def invalidate_previous_otps(self, db: Session, user_id: int, purpose: str) -> None:
        db.execute(
            update(EmailOTP)
            .where(
                EmailOTP.user_id == user_id,
                EmailOTP.purpose == purpose,
                EmailOTP.consumed_at.is_(None)
            )
            .values(consumed_at=datetime.now(timezone.utc))
        )
        db.commit()
