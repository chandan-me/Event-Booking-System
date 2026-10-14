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
