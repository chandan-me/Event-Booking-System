from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class GatewaySettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # Gateway Binding
    GATEWAY_HOST: str = "0.0.0.0"
    GATEWAY_PORT: int = 8000

    # Downstream Microservice URLs
    AUTH_SERVICE_URL: str = Field(default="http://localhost:8001")
    EVENT_SERVICE_URL: str = Field(default="http://localhost:8002")
    BOOKING_SERVICE_URL: str = Field(default="http://localhost:8003")
    NOTIFICATION_SERVICE_URL: str = Field(default="http://localhost:8004")

    # CORS configuration
    CORS_ALLOWED_ORIGINS: Union[str, List[str]] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    # HTTP client timeout in seconds
    REQUEST_TIMEOUT_SECONDS: float = 10.0

    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = GatewaySettings()
