from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.clients.event_client import BaseEventClient, HttpEventClient
from app.services.booking_service import BookingService
from app.services.ticket_service import TicketService
from app.core.config import settings

security_scheme = HTTPBearer(auto_error=False)
_event_client_singleton = HttpEventClient()


def get_event_client() -> BaseEventClient:
    """Dependency for inter-service Event calls; overridable in tests."""
    return _event_client_singleton


def get_booking_service() -> BookingService:
    return BookingService()


def get_ticket_service() -> TicketService:
    return TicketService()


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


def require_organizer_or_admin(payload: dict = Depends(get_current_user_payload)) -> dict:
    role = payload.get("role")
    if role not in ("ORGANIZER", "ORGANISER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizer or Administrative privileges required"
        )
    return payload


def get_optional_user_payload(credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme)) -> dict | None:
    if not credentials:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE
        )
        if payload.get("type") == "access":
            return payload
    except Exception:
        pass
    return None
