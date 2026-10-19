from fastapi import APIRouter, Request, Response
from app.core.config import settings
from app.core.proxy import forward_request

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication Gateway"])


@router.api_route("", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_auth(request: Request, path: str = "") -> Response:
    """Proxy authentication requests to Auth Service (Port 8001)."""
    subpath = f"/api/v1/auth/{path}" if path else "/api/v1/auth"
    return await forward_request(
        target_base_url=settings.AUTH_SERVICE_URL,
        request=request,
        path=subpath
    )
