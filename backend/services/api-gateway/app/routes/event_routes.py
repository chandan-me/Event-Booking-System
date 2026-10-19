from fastapi import APIRouter, Request, Response
from app.core.config import settings
from app.core.proxy import forward_request

router = APIRouter(prefix="/api/v1", tags=["Events & Categories Gateway"])


@router.api_route("/events", methods=["GET", "POST"])
@router.api_route("/events/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def proxy_events(request: Request, path: str = "") -> Response:
    """Proxy event queries and management to Event Service (Port 8002)."""
    subpath = f"/api/v1/events/{path}" if path else "/api/v1/events"
    return await forward_request(
        target_base_url=settings.EVENT_SERVICE_URL,
        request=request,
        path=subpath
    )


@router.api_route("/categories", methods=["GET", "POST"])
@router.api_route("/categories/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def proxy_categories(request: Request, path: str = "") -> Response:
    """Proxy category queries to Event Service (Port 8002)."""
    subpath = f"/api/v1/categories/{path}" if path else "/api/v1/categories"
    return await forward_request(
        target_base_url=settings.EVENT_SERVICE_URL,
        request=request,
        path=subpath
    )
