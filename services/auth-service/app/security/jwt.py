import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any
import jwt
from app.core.config import settings


def create_access_token(user_id: int, role: str, email: str, expires_delta: timedelta | None = None) -> str:
    """Generate a signed, short-lived JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access"
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_access_token(token: str) -> dict[str, Any]:
    """Verify and decode a JWT access token, strictly checking signature, issuer, and audience."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE
        )
        if payload.get("type") != "access":
            raise jwt.InvalidTokenError("Token is not an access token")
        return payload
    except jwt.PyJWTError as e:
        raise ValueError(f"Invalid access token: {str(e)}") from e


def generate_refresh_token() -> tuple[str, str]:
    """
    Generate an opaque, high-entropy 64-character refresh token and its SHA-256 hash.
    The raw token is returned to the client; only the hash is persisted in the database.
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_token(raw_token)
    return raw_token, token_hash


def hash_token(token: str) -> str:
    """Hash a token using SHA-256."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
