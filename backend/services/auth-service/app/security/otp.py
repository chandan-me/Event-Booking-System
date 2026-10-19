import hashlib
import hmac
import secrets


def generate_secure_otp() -> str:
    """Generate a cryptographically secure 6-digit numeric OTP (100000 - 999999)."""
    return f"{secrets.randbelow(900000) + 100000}"


def hash_otp(otp: str) -> str:
    """Hash an OTP code using SHA-256 for secure database storage."""
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def verify_otp_hash(plain_otp: str, hashed_otp: str) -> bool:
    """Constant-time comparison between raw OTP and stored SHA-256 hash to prevent timing attacks."""
    computed_hash = hash_otp(plain_otp)
    return hmac.compare_digest(computed_hash, hashed_otp)
