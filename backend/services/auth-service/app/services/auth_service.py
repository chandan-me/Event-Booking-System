from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.repositories.otp_repository import OTPRepository
from app.repositories.token_repository import TokenRepository
from app.security.password import hash_password, verify_password
from app.security.otp import generate_secure_otp, hash_otp, verify_otp_hash
from app.security.jwt import create_access_token, generate_refresh_token, hash_token
from app.security.totp import (
    generate_totp_secret, generate_backup_codes, verify_totp_code, get_totp_provisioning_uri
)
from app.services.email_service import BaseEmailService
from app.schemas.auth import TokenResponse, UserResponse, MFASetupResponse
from app.models.user import User


class AuthService:
    def __init__(
        self,
        user_repo: UserRepository | None = None,
        otp_repo: OTPRepository | None = None,
        token_repo: TokenRepository | None = None
    ):
        self.user_repo = user_repo or UserRepository()
        self.otp_repo = otp_repo or OTPRepository()
        self.token_repo = token_repo or TokenRepository()

    def register(self, db: Session, email_service: BaseEmailService, full_name: str, email: str, password: str, role: str = "CUSTOMER", organization_name: str | None = None) -> UserResponse:
        # Check if email is already taken
        existing_user = self.user_repo.get_by_email(db, email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )

        # Hash password with Argon2id
        pwd_hash = hash_password(password)
        user = self.user_repo.create(
            db,
            full_name=full_name,
            email=email,
            password_hash=pwd_hash,
            role=role,
            organization_name=organization_name
        )

        # Generate and dispatch single-use OTP
        raw_otp = generate_secure_otp()
        otp_hash = hash_otp(raw_otp)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        self.otp_repo.create_otp(db, user.id, "VERIFY_EMAIL", otp_hash, expires_at)

        email_service.send_otp_email(user.email, raw_otp, "VERIFY_EMAIL")

        return UserResponse.model_validate(user)

    def verify_email(self, db: Session, email: str, plain_otp: str) -> None:
        user = self.user_repo.get_by_email(db, email)
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification request.")

        if user.is_email_verified:
            return

        otp_record = self.otp_repo.get_latest_active_otp(db, user.id, "VERIFY_EMAIL")
        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active verification code found. Please request a new code."
            )

        now = datetime.now(timezone.utc)
        if otp_record.expires_at.replace(tzinfo=timezone.utc) < now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired. Please request a new one.")

        if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Maximum verification attempts exceeded. Please request a new code.")

        if not verify_otp_hash(plain_otp, otp_record.otp_hash):
            self.otp_repo.increment_attempts(db, otp_record)
            remaining = settings.OTP_MAX_ATTEMPTS - (otp_record.attempts)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification code. {remaining} attempt(s) remaining."
            )

        # Valid code: consume OTP and verify user
        self.otp_repo.mark_consumed(db, otp_record)
        user.is_email_verified = True
        self.user_repo.update(db, user)

    def resend_otp(self, db: Session, email_service: BaseEmailService, email: str) -> None:
        user = self.user_repo.get_by_email(db, email)
        if not user:
            # Prevent email enumeration: return safely
            return

        if user.is_email_verified:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is already verified.")

        latest_otp = self.otp_repo.get_latest_active_otp(db, user.id, "VERIFY_EMAIL")
        if latest_otp:
            time_since_creation = (datetime.now(timezone.utc) - latest_otp.created_at.replace(tzinfo=timezone.utc)).total_seconds()
            if time_since_creation < settings.OTP_RESEND_COOLDOWN_SECONDS:
                wait_sec = int(settings.OTP_RESEND_COOLDOWN_SECONDS - time_since_creation)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {wait_sec} seconds before requesting another code."
                )

        raw_otp = generate_secure_otp()
        otp_hash = hash_otp(raw_otp)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        self.otp_repo.create_otp(db, user.id, "VERIFY_EMAIL", otp_hash, expires_at)

        email_service.send_otp_email(user.email, raw_otp, "VERIFY_EMAIL")

    def login(self, db: Session, email: str, password: str, totp_code: str | None = None) -> TokenResponse:
        user = self.user_repo.get_by_email(db, email)
        # Prevent timing attacks and email enumeration: always verify password even if user is missing
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        if not user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email address before logging in. Check your inbox for the OTP."
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Please contact support."
            )

        # Check MFA if enabled on user account
        if getattr(user, "mfa_enabled", False):
            if not totp_code:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="MFA_REQUIRED: Multi-Factor Authentication code is required."
                )
            is_valid_totp = False
            if user.mfa_secret and verify_totp_code(user.mfa_secret, totp_code):
                is_valid_totp = True
            elif user.mfa_backup_codes:
                import json
                try:
                    codes = json.loads(user.mfa_backup_codes)
                    norm_code = totp_code.strip().upper()
                    if norm_code in codes:
                        codes.remove(norm_code)
                        user.mfa_backup_codes = json.dumps(codes)
                        self.user_repo.update(db, user)
                        is_valid_totp = True
                except Exception:
                    pass
            if not is_valid_totp:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Multi-Factor Authentication (MFA) code."
                )

        access_token = create_access_token(user.id, user.role, user.email)
        raw_refresh, token_hash = generate_refresh_token()
        refresh_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        self.token_repo.create_refresh_token(db, user.id, token_hash, refresh_expires)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            refresh_token=raw_refresh,
            user_id=user.id,
            role=user.role,
            email=user.email,
            full_name=user.full_name,
            organization_name=user.organization_name
        )

    def refresh_session(self, db: Session, raw_refresh_token: str) -> TokenResponse:
        token_hash = hash_token(raw_refresh_token)
        stored_token = self.token_repo.get_by_hash(db, token_hash)

        if not stored_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

        # Refresh Token Reuse Detection
        if stored_token.revoked_at is not None:
            # Compromised token used again! Invalidate all sessions for this user.
            self.token_repo.revoke_all_for_user(db, stored_token.user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Suspicious session activity detected. All sessions have been logged out for your security."
            )

        now = datetime.now(timezone.utc)
        if stored_token.expires_at.replace(tzinfo=timezone.utc) < now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired. Please log in again.")

        user = self.user_repo.get_by_id(db, stored_token.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive.")

        # Rotate: generate new refresh token and link replacement
        new_raw_refresh, new_token_hash = generate_refresh_token()
        new_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        self.token_repo.revoke(db, stored_token, replaced_by=new_token_hash)
        self.token_repo.create_refresh_token(db, user.id, new_token_hash, new_expires)

        new_access_token = create_access_token(user.id, user.role, user.email)

        return TokenResponse(
            access_token=new_access_token,
            token_type="bearer",
            expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            refresh_token=new_raw_refresh,
            user_id=user.id,
            role=user.role,
            email=user.email,
            full_name=user.full_name,
            organization_name=user.organization_name
        )

    def logout(self, db: Session, raw_refresh_token: str | None) -> None:
        if raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            stored_token = self.token_repo.get_by_hash(db, token_hash)
            if stored_token and stored_token.revoked_at is None:
                self.token_repo.revoke(db, stored_token)

    def forgot_password(self, db: Session, email_service: BaseEmailService, email: str) -> None:
        user = self.user_repo.get_by_email(db, email)
        if not user or not user.is_active:
            # Generic response to prevent email enumeration
            return

        raw_otp = generate_secure_otp()
        otp_hash = hash_otp(raw_otp)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
        self.otp_repo.create_otp(db, user.id, "PASSWORD_RESET", otp_hash, expires_at)

        email_service.send_otp_email(user.email, raw_otp, "PASSWORD_RESET")

    def reset_password(self, db: Session, email: str, plain_otp: str, new_password: str) -> None:
        user = self.user_repo.get_by_email(db, email)
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid password reset request.")

        otp_record = self.otp_repo.get_latest_active_otp(db, user.id, "PASSWORD_RESET")
        if not otp_record:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active password reset code found.")

        now = datetime.now(timezone.utc)
        if otp_record.expires_at.replace(tzinfo=timezone.utc) < now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset code has expired. Please request a new one.")

        if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many failed attempts. Please request a new code.")

        if not verify_otp_hash(plain_otp, otp_record.otp_hash):
            self.otp_repo.increment_attempts(db, otp_record)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code.")

        # Consume OTP and update password
        self.otp_repo.mark_consumed(db, otp_record)
        user.password_hash = hash_password(new_password)
        self.user_repo.update(db, user)

        # Invalidate all existing refresh tokens
        self.token_repo.revoke_all_for_user(db, user.id)

    def setup_mfa(self, db: Session, user: User) -> MFASetupResponse:
        import json
        secret = generate_totp_secret()
        backup_codes = generate_backup_codes()
        user.mfa_secret = secret
        user.mfa_backup_codes = json.dumps(backup_codes)
        self.user_repo.update(db, user)
        uri = get_totp_provisioning_uri(secret, user.email, issuer_name="EventBooking")
        return MFASetupResponse(
            secret=secret,
            provisioning_uri=uri,
            backup_codes=backup_codes
        )

    def verify_mfa(self, db: Session, user: User, code: str) -> bool:
        if not user.mfa_secret:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA setup has not been initiated.")
        if not verify_totp_code(user.mfa_secret, code):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code. Please check your authenticator app.")
        user.mfa_enabled = True
        self.user_repo.update(db, user)
        return True

    def disable_mfa(self, db: Session, user: User, password: str, code: str) -> bool:
        if not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password.")
        if user.mfa_secret and not verify_totp_code(user.mfa_secret, code):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authenticator code.")
        user.mfa_enabled = False
        user.mfa_secret = None
        user.mfa_backup_codes = None
        self.user_repo.update(db, user)
        return True
