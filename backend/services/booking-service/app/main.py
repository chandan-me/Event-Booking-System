import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.db.session import engine
from app.api.v1.bookings import router as bookings_router
from app.api.v1.tickets import router as tickets_router

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger("booking_service")


from app.models.base import Base
import app.models  # ensure models are registered

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Booking Service on port %d...", settings.BOOKING_PORT)
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database schemas verified/created successfully.")
    except Exception as e:
        logger.warning("Auto schema verification warning: %s", e)
    yield
    logger.info("Shutting down Booking Service...")


app = FastAPI(
    title="Event Booking System — Booking Service",
    description="Booking Lifecycle, Idempotency, Ticket Reservations, and Inventory Compensation Engine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", f"req-{uuid.uuid4().hex[:12]}")
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = getattr(request.state, "request_id", "unknown")
    code = "HTTP_ERROR"
    if exc.status_code == 400:
        code = "BAD_REQUEST"
    elif exc.status_code == 401:
        code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        code = "FORBIDDEN"
    elif exc.status_code == 404:
        code = "NOT_FOUND"
    elif exc.status_code == 409:
        code = "INSUFFICIENT_INVENTORY"
    elif exc.status_code == 502:
        code = "DOWNSTREAM_SERVICE_ERROR"

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": exc.detail,
                "request_id": request_id,
                "details": []
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", "unknown")
    errors = []
    for err in exc.errors():
        field = ".".join(str(loc) for loc in err.get("loc", []))
        errors.append({
            "field": field,
            "issue": err.get("msg", "Invalid value")
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed",
                "request_id": request_id,
                "details": errors
            }
        }
    )


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "booking-service"}


@app.get("/health/ready", tags=["Health"])
def readiness_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "error": str(e)}
        )


app.include_router(bookings_router)
app.include_router(tickets_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.BOOKING_HOST, port=settings.BOOKING_PORT, reload=True)
