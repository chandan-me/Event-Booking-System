import base64
import hashlib
import hmac
import secrets
import struct
import time
from typing import List, Tuple


def generate_totp_secret() -> str:
    """Generate a base32-encoded 160-bit (20 byte) secret key for TOTP (RFC 6238)."""
    raw_bytes = secrets.token_bytes(20)
    return base64.b32encode(raw_bytes).decode("ascii").rstrip("=")


def generate_backup_codes(count: int = 8) -> List[str]:
    """Generate cryptographically secure single-use emergency backup codes."""
    codes = []
    for _ in range(count):
        part1 = secrets.token_hex(2).upper()
        part2 = secrets.token_hex(2).upper()
        codes.append(f"{part1}-{part2}")
    return codes


def get_totp_code(secret: str, for_time: float | None = None, time_step: int = 30) -> str:
    """Computes standard 6-digit TOTP code for the given secret and timestamp."""
    if for_time is None:
        for_time = time.time()
    counter = int(for_time // time_step)
    counter_bytes = struct.pack(">Q", counter)

    # Pad secret if padding was stripped
    padded_secret = secret.upper()
    missing_padding = len(padded_secret) % 8
    if missing_padding != 0:
        padded_secret += "=" * (8 - missing_padding)

    secret_bytes = base64.b32decode(padded_secret, casefold=True)
    hmac_digest = hmac.new(secret_bytes, counter_bytes, hashlib.sha1).digest()

    offset = hmac_digest[-1] & 0x0F
    code_int = struct.unpack(">I", hmac_digest[offset:offset + 4])[0] & 0x7FFFFFFF
    code_6digit = code_int % 1000000
    return f"{code_6digit:06d}"


def verify_totp_code(secret: str, code: str, time_step: int = 30, window: int = 1) -> bool:
    """
    Verifies a 6-digit TOTP code against the secret key.
    Allows clock drift within +/- window * time_step seconds (default +/- 30s).
    """
    if not secret or not code or len(code.strip()) != 6:
        return False

    code = code.strip()
    current_time = time.time()
    for drift in range(-window, window + 1):
        check_time = current_time + (drift * time_step)
        expected_code = get_totp_code(secret, for_time=check_time, time_step=time_step)
        if hmac.compare_digest(expected_code, code):
            return True
    return False


def get_totp_provisioning_uri(secret: str, email: str, issuer_name: str = "EventBookingSystem") -> str:
    """Generates standard otpauth:// URI for QR code integration in authenticator apps."""
    from urllib.parse import quote
    clean_email = quote(email)
    clean_issuer = quote(issuer_name)
    return f"otpauth://totp/{clean_issuer}:{clean_email}?secret={secret}&issuer={clean_issuer}&algorithm=SHA1&digits=6&period=30"
