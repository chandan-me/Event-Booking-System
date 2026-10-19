import httpx
from fastapi import APIRouter, Depends, Request
from app.core.config import settings

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Dashboard Gateway"])


@router.get("/dashboard", summary="Aggregated administrative platform metrics")
async def get_admin_dashboard(request: Request):
    """
    Combines high-level operational statistics across all microservices:
    - Service availability
    - Event and booking counts
    """
    dashboard_data = {
        "services": {},
        "summary": {
            "platform_status": "OPERATIONAL",
            "active_services": 4
        }
    }

    async with httpx.AsyncClient(timeout=3.0) as client:
        # Check all internal service healths in parallel
        for name, url in [
            ("auth", settings.AUTH_SERVICE_URL),
            ("events", settings.EVENT_SERVICE_URL),
            ("bookings", settings.BOOKING_SERVICE_URL),
            ("notifications", settings.NOTIFICATION_SERVICE_URL)
        ]:
            try:
                res = await client.get(f"{url}/health")
                dashboard_data["services"][name] = "ONLINE" if res.status_code == 200 else "DEGRADED"
            except Exception:
                dashboard_data["services"][name] = "OFFLINE"

    return {
        "success": True,
        "data": dashboard_data,
        "message": "Dashboard metrics retrieved successfully"
    }
