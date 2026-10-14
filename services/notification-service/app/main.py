import asyncio
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
from app.db.session import engine, SessionLocal
from app.api.v1.notifications import router as notifications_router
from app.messaging.consumer import start_rabbitmq_consumer
from app.services.email_sender import SMTPEmailSender
from app.repositories.notification_repository import NotificationRepository

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger("notification_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Notification Service on port %d...", settings.NOTIFICATION_PORT)
    # Launch background AMQP worker task
    consumer_task = asyncio.create_task(
        start_rabbitmq_consumer(
            db_session_factory=SessionLocal,
            email_sender=SMTPEmailSender(),
            notif_repo=NotificationRepository()
        )
    )
    yield
    logger.info("Shutting down Notification Service...")
    consumer_task.cancel()


app = FastAPI(
    title="Event Booking System — Notification Service",
    description="Asynchronous Notification Worker, RabbitMQ Event Consumer, and SMTP Dispatcher",
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
    return {"status": "healthy", "service": "notification-service"}


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


app.include_router(notifications_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.NOTIFICATION_HOST, port=settings.NOTIFICATION_PORT, reload=True)
