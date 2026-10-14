from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class BookingSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # Server Binding
    BOOKING_HOST: str = "0.0.0.0"
    BOOKING_PORT: int = 8003

    # Database
    BOOKING_DATABASE_URL: str = Field(
        default="mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_booking_db"
    )

    # Inter-Service URL for Event Service
    EVENT_SERVICE_URL: str = Field(
        default="http://localhost:8002"
    )
    INTERNAL_SERVICE_KEY: str = Field(
        default="dev_internal_secret_key_between_microservices"
    )

    # JWT Authentication verification (must match Auth Service)
    JWT_SECRET_KEY: str = Field(
        default="dev_jwt_secret_change_in_production_min_32_chars_long_12345"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "event-booking-auth"
    JWT_AUDIENCE: str = "event-booking-services"

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = Field(default="rzp_test_EventPass2026")
    RAZORPAY_KEY_SECRET: str = Field(default="dev_razorpay_secret_key_12345")
    RAZORPAY_ENABLED: bool = True


settings = BookingSettings()
