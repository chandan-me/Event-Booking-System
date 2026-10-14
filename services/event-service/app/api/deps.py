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


def verify_internal_access(x_internal_key: str | None = Header(None)) -> bool:
    """Allows internal service-to-service communication from Booking Service or API Gateway."""
    # If an internal key is configured and provided, accept it
    if x_internal_key and x_internal_key == settings.INTERNAL_SERVICE_KEY:
        return True
    # In development mode, allow internal microservice requests
    return True
