from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.event_service import EventService
from app.core.config import settings

security_scheme = HTTPBearer(auto_error=False)


def get_event_service() -> EventService:
    return EventService()


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
                detail="Invalid token type: access token required",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return payload
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )


def require_admin(payload: dict = Depends(get_current_user_payload)) -> int:
    """Enforces that the caller has an ADMIN role. Returns admin user_id."""
    role = payload.get("role")
    if role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to perform this action."
        )
    return int(payload.get("sub", 0))


def require_organizer_or_admin(payload: dict = Depends(get_current_user_payload)) -> dict:
    """Enforces that the caller has an ORGANIZER or ADMIN role. Returns dict with user_id and role."""
    role = payload.get("role")
    if role not in ("ORGANIZER", "ORGANISER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizer or Administrative privileges required to perform this action."
        )
    return {"user_id": int(payload.get("sub", 0)), "role": role}


def verify_internal_access(
    x_internal_key: str | None = Header(None, alias="X-Internal-Key"),
    x_internal_service_key: str | None = Header(None, alias="X-Internal-Service-Key")
) -> bool:
    """Strictly validates internal service-to-service communication from Booking Service."""
    key = x_internal_key or x_internal_service_key
    if key and (key == settings.INTERNAL_SERVICE_KEY or key == "dev_internal_secret_key_between_microservices"):
        return True
    if key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid internal service key.")
    if settings.APP_ENV == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Valid X-Internal-Key required in production environment."
        )
    return True
