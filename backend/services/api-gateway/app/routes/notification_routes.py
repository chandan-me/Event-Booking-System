from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.proxy import forward_request

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications Gateway"])


@router.api_route("", methods=["GET"])
@router.api_route("/{path:path}", methods=["GET", "POST"])
async def proxy_notifications(request: Request, path: str = "") -> Response:
    """Proxy notification audit queries to Notification Service (Port 8004)."""
    # Block external direct email dispatch from public API Gateway
    if path.strip("/").startswith("send-direct"):
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "Direct notification dispatch is reserved for internal microservices.",
                    "details": []
                }
            }
        )

    subpath = f"/api/v1/notifications/{path}" if path else "/api/v1/notifications"
    return await forward_request(
        target_base_url=settings.NOTIFICATION_SERVICE_URL,
        request=request,
        path=subpath
    )
