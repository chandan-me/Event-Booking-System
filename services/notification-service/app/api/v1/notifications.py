import math
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session

from app.schemas.notification import (
    NotificationRecordResponse, DirectNotificationRequest,
    PaginatedResponse, StandardResponse, NotificationEventMessage
)
from app.api.deps import (
    get_db, get_email_sender, get_notification_repository, require_admin
)
from app.repositories.notification_repository import NotificationRepository
from app.services.email_sender import BaseEmailSender
from app.messaging.consumer import process_notification_event

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=StandardResponse[PaginatedResponse[NotificationRecordResponse]],
    summary="List notification delivery audit logs (Admin only)"
)
def list_notification_records(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    status: Optional[str] = Query(None, description="Filter by delivery status (PENDING, SENT, FAILED)"),
    recipient: Optional[str] = Query(None, description="Filter by recipient email"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
    admin_payload: dict = Depends(require_admin)
):
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    records, total = notif_repo.list_records(
        db=db,
        page=page,
        page_size=page_size,
        event_type=event_type,
        status=status,
        recipient=recipient
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return StandardResponse(
        success=True,
        data=PaginatedResponse(
            items=[NotificationRecordResponse.model_validate(r) for r in records],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        ),
        message="Notification records retrieved successfully"
    )


@router.post(
    "/send-direct",
    response_model=StandardResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Dispatch a notification directly (Synchronous / Testing fallback)"
)
def send_notification_direct(
    req: DirectNotificationRequest,
    db: Session = Depends(get_db),
    email_sender: BaseEmailSender = Depends(get_email_sender),
    notif_repo: NotificationRepository = Depends(get_notification_repository)
):
    msg = NotificationEventMessage(
        message_id=f"direct-{uuid.uuid4().hex}",
        event_type=req.event_type,
        recipient=req.recipient,
        payload=req.payload
    )

    success = process_notification_event(
        db=db,
        email_sender=email_sender,
        notif_repo=notif_repo,
        event_msg=msg
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to dispatch notification."
        )

    return StandardResponse(
        success=True,
        data={"message_id": msg.message_id, "status": "SENT"},
        message="Notification dispatched successfully"
    )
