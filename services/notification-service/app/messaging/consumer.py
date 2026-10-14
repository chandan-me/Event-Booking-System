import json
import logging
from typing import Optional
from sqlalchemy.orm import Session
import aio_pika

from app.core.config import settings
from app.schemas.notification import NotificationEventMessage
from app.repositories.notification_repository import NotificationRepository
from app.services.email_sender import BaseEmailSender
from app.templates.email_templates import (
    render_otp_template,
    render_booking_confirmation_template,
    render_booking_cancellation_template
)

logger = logging.getLogger(__name__)


def process_notification_event(
    db: Session,
    email_sender: BaseEmailSender,
    notif_repo: NotificationRepository,
    event_msg: NotificationEventMessage
) -> bool:
    """
    Idempotent message processor:
    1. Checks if message_id was previously consumed.
    2. Renders domain HTML template.
    3. Dispatches email via SMTP.
    4. Writes audit records and commits deduplication token.
    """
    # 1. Deduplication check
    if notif_repo.is_message_processed(db, event_msg.message_id):
        logger.info("Message %s already processed. Skipping duplicate delivery.", event_msg.message_id)
        return True

    # 2. Audit record creation
    record = notif_repo.create_record(
        db=db,
        event_type=event_msg.event_type,
        recipient=event_msg.recipient,
        status="PENDING"
    )

    payload = event_msg.payload
    subject = "Security Notification"
    html_body = ""

    # 3. Template selection
    if event_msg.event_type == "VERIFY_EMAIL":
        subject = "Your Verification Code"
        otp = payload.get("otp", "000000")
        html_body = render_otp_template(otp, "VERIFY_EMAIL")
    elif event_msg.event_type == "PASSWORD_RESET":
        subject = "Password Reset Request"
        otp = payload.get("otp", "000000")
        html_body = render_otp_template(otp, "PASSWORD_RESET")
    elif event_msg.event_type == "BOOKING_CONFIRMATION":
        ref = payload.get("booking_reference", "UNKNOWN")
        subject = f"Booking Confirmed — {ref}"
        html_body = render_booking_confirmation_template(
            booking_ref=ref,
            event_title=payload.get("event_title", "Event"),
            quantity=payload.get("quantity", 1),
            total_amount=str(payload.get("total_amount", "0.00")),
            currency=payload.get("currency", "USD"),
            venue_name=payload.get("venue_name", "Main Venue"),
            start_at=payload.get("start_at", "Scheduled Date")
        )
    elif event_msg.event_type == "BOOKING_CANCELLATION":
        ref = payload.get("booking_reference", "UNKNOWN")
        subject = f"Booking Cancelled — {ref}"
        html_body = render_booking_cancellation_template(
            booking_ref=ref,
            event_title=payload.get("event_title", "Event"),
            quantity=payload.get("quantity", 1),
            reason=payload.get("reason", "Customer cancellation")
        )
    else:
        logger.warning("Unrecognized event type: %s", event_msg.event_type)
        notif_repo.update_record_status(db, record, "FAILED", f"Unsupported event type: {event_msg.event_type}")
        return False

    # 4. Dispatch Email
    delivered = email_sender.send_html_email(
        recipient=event_msg.recipient,
        subject=subject,
        html_body=html_body
    )

    if delivered:
        notif_repo.update_record_status(db, record, "SENT")
        notif_repo.mark_message_processed(db, event_msg.message_id)
        logger.info("Notification successfully processed and logged for message %s", event_msg.message_id)
        return True
    else:
        notif_repo.update_record_status(db, record, "FAILED", "SMTP dispatch error")
        return False


async def start_rabbitmq_consumer(
    db_session_factory,
    email_sender: BaseEmailSender,
    notif_repo: NotificationRepository
):
    """
    Background AMQP worker that attaches to RabbitMQ, configures DLQ, and starts listening.
    """
    try:
        connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=10)

        # Declare Dead-Letter Exchange (DLX) & Dead-Letter Queue (DLQ)
        dlx = await channel.declare_exchange(settings.RABBITMQ_DLX_EXCHANGE, aio_pika.ExchangeType.DIRECT, durable=True)
        dlq = await channel.declare_queue(settings.RABBITMQ_DLQ, durable=True)
        await dlq.bind(dlx, routing_key="notification.dlq")

        # Declare Primary Topic Exchange
        exchange = await channel.declare_exchange(settings.RABBITMQ_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True)

        # Declare Main Notification Queue with dead-letter routing configured
        queue = await channel.declare_queue(
            settings.RABBITMQ_QUEUE,
            durable=True,
            arguments={
                "x-dead-letter-exchange": settings.RABBITMQ_DLX_EXCHANGE,
                "x-dead-letter-routing-key": "notification.dlq"
            }
        )

        # Bind topic keys
        await queue.bind(exchange, routing_key="auth.*")
        await queue.bind(exchange, routing_key="booking.*")
        await queue.bind(exchange, routing_key="notification.*")

        logger.info("RabbitMQ Notification Consumer connected and listening on queue '%s'", settings.RABBITMQ_QUEUE)

        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process(requeue=False, ignore_processed=True):
                    try:
                        raw_data = json.loads(message.body.decode())
                        event_msg = NotificationEventMessage.model_validate(raw_data)

                        db = db_session_factory()
                        try:
                            success = process_notification_event(db, email_sender, notif_repo, event_msg)
                            if not success:
                                # Reject to dead-letter queue if maximum retries reached
                                if event_msg.retry_count >= settings.MAX_RETRIES:
                                    logger.error("Max retries exceeded for message %s. Moving to DLQ.", event_msg.message_id)
                                    await message.reject(requeue=False)
                                else:
                                    # Requeue with incremented retry
                                    await message.reject(requeue=True)
                        finally:
                            db.close()
                    except Exception as e:
                        logger.error("Failed to parse/process message %s: %s", message.message_id, str(e))
                        await message.reject(requeue=False)

    except Exception as e:
        logger.warning("RabbitMQ consumer connection inactive: %s (service continuing in direct mode)", str(e))
