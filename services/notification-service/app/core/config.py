from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class NotificationSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # Server Binding
    NOTIFICATION_HOST: str = "0.0.0.0"
    NOTIFICATION_PORT: int = 8004

    # Database
    NOTIFICATION_DATABASE_URL: str = Field(
        default="mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_notification_db"
    )

    # RabbitMQ Message Broker
    RABBITMQ_URL: str = Field(
        default="amqp://guest:guest@localhost:5672//"
    )
    RABBITMQ_EXCHANGE: str = "events.topic"
    RABBITMQ_QUEUE: str = "notification.jobs.queue"
    RABBITMQ_DLX_EXCHANGE: str = "events.dlx"
    RABBITMQ_DLQ: str = "notification.jobs.dlq"
    MAX_RETRIES: int = 3

    # SMTP Configuration
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USERNAME: str = "dev_smtp_user"
    SMTP_PASSWORD: str = "dev_smtp_password"
    SMTP_FROM_EMAIL: str = "notifications@eventbooking.local"
    SMTP_USE_TLS: bool = False

    # JWT Authentication verification
    JWT_SECRET_KEY: str = Field(
        default="dev_jwt_secret_change_in_production_min_32_chars_long_12345"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "event-booking-auth"
    JWT_AUDIENCE: str = "event-booking-services"


settings = NotificationSettings()
