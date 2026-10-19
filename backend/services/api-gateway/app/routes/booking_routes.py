from fastapi import APIRouter, Request, Response
from app.core.config import settings
from app.core.proxy import forward_request

router = APIRouter(prefix="/api/v1", tags=["Bookings Gateway"])


@router.api_route("/bookings", methods=["GET", "POST"])
@router.api_route("/bookings/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def proxy_bookings(request: Request, path: str = "") -> Response:
    """Proxy booking requests to Booking Service (Port 8003)."""
    subpath = f"/api/v1/bookings/{path}" if path else "/api/v1/bookings"
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path=subpath
    )


@router.api_route("/admin/bookings", methods=["GET"])
async def proxy_admin_bookings(request: Request) -> Response:
    """Proxy admin booking reports to Booking Service (Port 8003)."""
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path="/api/v1/admin/bookings"
    )


@router.api_route("/tickets", methods=["GET", "POST"])
@router.api_route("/tickets/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def proxy_tickets(request: Request, path: str = "") -> Response:
    """Proxy ticket operations to Booking Service (Port 8003)."""
    subpath = f"/api/v1/tickets/{path}" if path else "/api/v1/tickets"
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path=subpath
    )


@router.api_route("/check-in", methods=["POST"])
@router.api_route("/check-in/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def proxy_check_in(request: Request, path: str = "") -> Response:
    """Proxy check-in and QR scanning to Booking Service (Port 8003)."""
    subpath = f"/api/v1/check-in/{path}" if path else "/api/v1/check-in"
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path=subpath
    )


@router.api_route("/events/{event_id}/check-in-stats", methods=["GET"])
async def proxy_event_check_in_stats(request: Request, event_id: str) -> Response:
    """Proxy check-in statistics to Booking Service (Port 8003)."""
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path=f"/api/v1/events/{event_id}/check-in-stats"
    )


@router.api_route("/waiting-list", methods=["GET", "POST"])
@router.api_route("/waiting-list/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def proxy_waiting_list(request: Request, path: str = "") -> Response:
    """Proxy waiting list operations to Booking Service (Port 8003)."""
    subpath = f"/api/v1/waiting-list/{path}" if path else "/api/v1/waiting-list"
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path=subpath
    )


@router.api_route("/admin/waiting-list", methods=["GET"])
async def proxy_admin_waiting_list(request: Request) -> Response:
    """Proxy platform waiting list queries to Booking Service (Port 8003)."""
    return await forward_request(
        target_base_url=settings.BOOKING_SERVICE_URL,
        request=request,
        path="/api/v1/admin/waiting-list"
    )

