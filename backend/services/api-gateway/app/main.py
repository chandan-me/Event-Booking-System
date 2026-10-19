import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.core.config import settings
from app.routes.auth_routes import router as auth_router
from app.routes.event_routes import router as event_router
from app.routes.booking_routes import router as booking_router
from app.routes.notification_routes import router as notification_router
from app.routes.admin_routes import router as admin_router
from app.routes.organizer_routes import router as organizer_router

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger("api_gateway")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting API Gateway on port %d...", settings.GATEWAY_PORT)
    logger.info("Forwarding to Auth (%s), Events (%s), Bookings (%s), Notifications (%s)",
                settings.AUTH_SERVICE_URL, settings.EVENT_SERVICE_URL,
                settings.BOOKING_SERVICE_URL, settings.NOTIFICATION_SERVICE_URL)
    yield
    logger.info("Shutting down API Gateway...")


app = FastAPI(
    title="Event Booking System — API Gateway",
    description="Unified API Reverse Proxy, Request Router, CORS Manager, and Observability Boundary",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

from app.middleware.rate_limiter import rate_limiter

# Centralized CORS Configuration for Frontend Origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_and_request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", f"gw-{uuid.uuid4().hex[:12]}")
    request.state.request_id = request_id

    # 1. Rate Limiting Check
    is_limited, remaining, reset_in = await rate_limiter.is_rate_limited(request)
    if is_limited:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "success": False,
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Too many requests. Please wait {reset_in} seconds before trying again.",
                    "request_id": request_id
                }
            },
            headers={
                "X-Request-ID": request_id,
                "Retry-After": str(reset_in),
                "X-RateLimit-Remaining": "0"
            }
        )

    response = await call_next(request)

    # 2. Security Headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' http: ws:;"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    return response


# Aggregated Health Check
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Aggregated health probe checking gateway operational status
    and pinging all internal microservices.
    """
    dependencies = {}
    async with httpx.AsyncClient(timeout=2.0) as client:
        for name, url in [
            ("auth_service", settings.AUTH_SERVICE_URL),
            ("event_service", settings.EVENT_SERVICE_URL),
            ("booking_service", settings.BOOKING_SERVICE_URL),
            ("notification_service", settings.NOTIFICATION_SERVICE_URL),
        ]:
            try:
                res = await client.get(f"{url}/health")
                dependencies[name] = "UP" if res.status_code == 200 else "DEGRADED"
            except Exception:
                dependencies[name] = "DOWN"

    all_up = all(status == "UP" for status in dependencies.values())

    return {
        "status": "healthy" if all_up else "degraded",
        "service": "api-gateway",
        "dependencies": dependencies
    }


# Mount all microservice routes
app.include_router(auth_router)
app.include_router(event_router)
app.include_router(booking_router)
app.include_router(notification_router)
app.include_router(admin_router)
app.include_router(organizer_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.GATEWAY_HOST, port=settings.GATEWAY_PORT, reload=True)
