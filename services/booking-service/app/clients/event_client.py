import abc
import logging
from decimal import Decimal
from typing import Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)


class BaseEventClient(abc.ABC):
    @abc.abstractmethod
    def get_event(self, event_id: int) -> Dict[str, Any]:
        """Fetch authoritative event details and price."""
        pass

    @abc.abstractmethod
    def reserve_tickets(self, event_id: int, quantity: int, reservation_id: str) -> Dict[str, Any]:
        """Request atomic reservation in Event Service."""
        pass

    @abc.abstractmethod
    def release_tickets(self, event_id: int, quantity: int, reservation_id: str) -> Dict[str, Any]:
        """Compensating transaction releasing reserved tickets."""
        pass


class HttpEventClient(BaseEventClient):
    def __init__(self, base_url: str = settings.EVENT_SERVICE_URL, timeout_seconds: float = 5.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout_seconds
        self.headers = {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY}

    def get_event(self, event_id: int) -> Dict[str, Any]:
        url = f"{self.base_url}/api/v1/events/{event_id}"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(url, headers=self.headers)
                if res.status_code == 404:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
                res.raise_for_status()
                return res.json()["data"]
        except httpx.HTTPError as e:
            logger.error("Error communicating with Event Service GET %s: %s", url, str(e))
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to contact Event Service.")

    def reserve_tickets(self, event_id: int, quantity: int, reservation_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/api/v1/internal/events/{event_id}/reserve"
        payload = {"quantity": quantity, "reservation_id": reservation_id}
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, json=payload, headers=self.headers)
                if res.status_code == 409:
                    error_msg = res.json().get("error", {}).get("message", "Insufficient ticket inventory")
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)
                res.raise_for_status()
                return res.json()["data"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 409:
                raise
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to reserve tickets in Event Service.")
        except httpx.HTTPError as e:
            logger.error("HTTP error during ticket reservation on %s: %s", url, str(e))
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Event Service is unavailable.")

    def release_tickets(self, event_id: int, quantity: int, reservation_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/api/v1/internal/events/{event_id}/release"
        payload = {"quantity": quantity, "reservation_id": reservation_id}
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, json=payload, headers=self.headers)
                res.raise_for_status()
                return res.json()["data"]
        except Exception as e:
            logger.error("CRITICAL: Compensating inventory release failed for event %d: %s", event_id, str(e))
            # Compensation failure must be logged for administrative reconciliation
            return {}


class FakeEventClient(BaseEventClient):
    """In-memory mock client for fast, deterministic unit & failure tests."""
    def __init__(self):
        self.events: Dict[int, Dict[str, Any]] = {
            1: {
                "id": 1,
                "title": "Mock Tech Summit",
                "price": Decimal("50.00"),
                "currency": "USD",
                "available_capacity": 10,
                "total_capacity": 10,
                "status": "PUBLISHED"
            }
        }
        self.reservations: list[dict] = []
        self.releases: list[dict] = []
        self.simulate_downstream_failure = False

    def get_event(self, event_id: int) -> Dict[str, Any]:
        if event_id not in self.events:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        return self.events[event_id]

    def reserve_tickets(self, event_id: int, quantity: int, reservation_id: str) -> Dict[str, Any]:
        event = self.get_event(event_id)
        if event["available_capacity"] < quantity:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Insufficient tickets available")
        event["available_capacity"] -= quantity
        self.reservations.append({"event_id": event_id, "quantity": quantity, "reservation_id": reservation_id})
        return {"event_id": event_id, "reserved_quantity": quantity, "remaining_capacity": event["available_capacity"]}

    def release_tickets(self, event_id: int, quantity: int, reservation_id: str) -> Dict[str, Any]:
        event = self.get_event(event_id)
        event["available_capacity"] = min(event["total_capacity"], event["available_capacity"] + quantity)
        self.releases.append({"event_id": event_id, "quantity": quantity, "reservation_id": reservation_id})
        return {"event_id": event_id, "released_quantity": quantity, "remaining_capacity": event["available_capacity"]}
