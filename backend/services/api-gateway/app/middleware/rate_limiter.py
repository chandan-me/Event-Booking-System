import time
import asyncio
from typing import Dict, List, Tuple
from collections import defaultdict
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse

class InMemoryRateLimiter:
    """
    Sliding-window in-memory rate limiter per client IP.
    Protects against brute force on auth endpoints while allowing higher throughput for normal APIs.
    """
    def __init__(self):
        # Maps (ip, tier) -> list of timestamp floats
        self._history: Dict[Tuple[str, str], List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

        # Limits (max_requests, window_seconds)
        self.LIMITS = {
            "auth": (20, 60),      # 20 requests / min for login, register, OTP, MFA
            "general": (200, 60),   # 200 requests / min for standard queries
        }

    def _get_tier(self, path: str) -> str:
        p = path.lower()
        if any(auth_kw in p for auth_kw in [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/verify-otp",
            "/api/v1/auth/resend-otp",
            "/api/v1/auth/mfa",
            "/api/v1/auth/refresh"
        ]):
            return "auth"
        return "general"

    async def is_rate_limited(self, request: Request) -> Tuple[bool, int, int]:
        """
        Returns (is_limited, remaining, reset_seconds).
        """
        # Exempt health probes and CORS preflights
        if request.method == "OPTIONS" or request.url.path.startswith("/health"):
            return False, 999, 0

        client_ip = request.client.host if request.client else "127.0.0.1"
        tier = self._get_tier(request.url.path)
        max_reqs, window = self.LIMITS[tier]

        now = time.time()
        cutoff = now - window

        async with self._lock:
            key = (client_ip, tier)
            history = self._history[key]
            # Prune old timestamps
            self._history[key] = [t for t in history if t > cutoff]
            current_count = len(self._history[key])

            if current_count >= max_reqs:
                oldest = self._history[key][0]
                reset_in = max(1, int(window - (now - oldest)))
                return True, 0, reset_in

            self._history[key].append(now)
            remaining = max_reqs - (current_count + 1)
            return False, remaining, window


rate_limiter = InMemoryRateLimiter()
