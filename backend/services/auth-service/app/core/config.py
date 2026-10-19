from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class AuthSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # Server Binding
    AUTH_HOST: str = "0.0.0.0"
    AUTH_PORT: int = 8001

    # Database
    AUTH_DATABASE_URL: str = Field(
        default="mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_auth_db"
    )

    # JWT Authentication
    JWT_SECRET_KEY: str = Field(
        default="dev_jwt_secret_change_in_production_min_32_chars_long_12345"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "event-booking-auth"
    JWT_AUDIENCE: str = "event-booking-services"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OTP Policy
    OTP_EXPIRE_MINUTES: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60
    OTP_MAX_ATTEMPTS: int = 5
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15

    # SMTP Settings (Default to local Mailpit / dev mailer)
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USERNAME: str = "dev_smtp_user"
    SMTP_PASSWORD: str = "dev_smtp_password"
    SMTP_FROM_EMAIL: str = "no-reply@eventbooking.com"
    SMTP_USE_TLS: bool = False


settings = AuthSettings()
