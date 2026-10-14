from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class EventSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # Server Binding
    EVENT_HOST: str = "0.0.0.0"
    EVENT_PORT: int = 8002

    # Database
    EVENT_DATABASE_URL: str = Field(
        default="mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_catalog_db"
    )

    # JWT Authentication verification (must match Auth Service)
    JWT_SECRET_KEY: str = Field(
        default="dev_jwt_secret_change_in_production_min_32_chars_long_12345"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "event-booking-auth"
    JWT_AUDIENCE: str = "event-booking-services"

    # Internal Service Authentication Key
    INTERNAL_SERVICE_KEY: str = Field(
        default="dev_internal_secret_key_between_microservices"
    )


settings = EventSettings()
