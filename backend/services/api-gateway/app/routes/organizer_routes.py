from fastapi import APIRouter, Request, Response
from app.core.config import settings
from app.core.proxy import forward_request

router = APIRouter(prefix="/api/v1/organizer", tags=["Organizer Portal Gateway"])


@router.api_route("/analytics", methods=["GET"])
async def proxy_organizer_analytics(request: Request) -> Response:
    """Proxy organizer revenue and attendance analytics to Booking Service."""
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path="/api/v1/organizer/analytics"
    )


@router.api_route("/check-in", methods=["POST"])
async def proxy_organizer_check_in(request: Request) -> Response:
    """Proxy ticket check-in and QR verification to Booking Service."""
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path="/api/v1/organizer/check-in"
    )


@router.api_route("/events/{event_id}/attendees", methods=["GET"])
async def proxy_organizer_attendees(request: Request, event_id: str) -> Response:
    """Proxy attendee roster and QR code retrieval to Booking Service."""
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path=f"/api/v1/organizer/events/{event_id}/attendees"
    )


@router.api_route("/events/{event_id}/check-in-stats", methods=["GET"])
async def proxy_organizer_check_in_stats(request: Request, event_id: str) -> Response:
    """Proxy organizer live check-in stats to Booking Service."""
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path=f"/api/v1/organizer/events/{event_id}/check-in-stats"
    )


@router.api_route("/events/{event_id}/waiting-list", methods=["GET"])
async def proxy_organizer_event_waiting_list(request: Request, event_id: str) -> Response:
    """Proxy event waiting list to Booking Service."""
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path=f"/api/v1/organizer/events/{event_id}/waiting-list"
    )


@router.api_route("/waiting-list", methods=["GET"])
async def proxy_organizer_all_waiting_list(request: Request) -> Response:
    """Proxy organizer aggregate waiting list to Booking Service."""
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path="/api/v1/organizer/waiting-list"
    )


@router.api_route("/events/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
@router.api_route("/events", methods=["GET", "POST"])
async def proxy_organizer_events(request: Request, path: str = "") -> Response:
    """Proxy organizer event hosting and seat management to Event Service."""
    subpath = f"/api/v1/organizer/events/{path}" if path else "/api/v1/organizer/events"
    return await forward_request(
        target_base_url=settings.EVENT_SERVICE_URL,
        request=request,
        path=subpath
    )
