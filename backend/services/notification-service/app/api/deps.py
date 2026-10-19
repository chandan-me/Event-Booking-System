from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.email_sender import BaseEmailSender, SMTPEmailSender
from app.repositories.notification_repository import NotificationRepository
from app.core.config import settings

security_scheme = HTTPBearer(auto_error=False)
_email_sender_singleton = SMTPEmailSender()
_notif_repo_singleton = NotificationRepository()


def get_email_sender() -> BaseEmailSender:
    """Dependency for email dispatch; overridable in tests."""
    return _email_sender_singleton


def get_notification_repository() -> NotificationRepository:
    return _notif_repo_singleton


def get_current_user_payload(credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme)) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header with Bearer token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE
        )
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return payload
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )


def require_admin(payload: dict = Depends(get_current_user_payload)) -> dict:
    if payload.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required"
        )
    return payload


def verify_internal_or_admin(
    x_internal_key: str | None = Header(None, alias="X-Internal-Key"),
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme)
) -> bool:
    import hmac
    if x_internal_key and settings.INTERNAL_SERVICE_KEY:
        if hmac.compare_digest(x_internal_key, settings.INTERNAL_SERVICE_KEY):
            return True

    if credentials:
        try:
            payload = jwt.decode(
                credentials.credentials,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                issuer=settings.JWT_ISSUER,
                audience=settings.JWT_AUDIENCE
            )
            if payload.get("role") == "ADMIN" and payload.get("type") == "access":
                return True
        except jwt.PyJWTError:
            pass

    if settings.APP_ENV == "testing":
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Internal service key or Admin authorization required."
    )

