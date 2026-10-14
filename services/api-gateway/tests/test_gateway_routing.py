import os
import sys
from unittest.mock import AsyncMock, patch
import httpx
import pytest
from starlette.testclient import TestClient

SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from app.main import app

client = TestClient(app)


def test_request_id_injected_when_absent():
    mock_response = httpx.Response(status_code=200, json={"status": "healthy"})
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        response = client.get("/health")
        assert response.status_code == 200
        assert "x-request-id" in response.headers
        assert response.headers["x-request-id"].startswith("gw-")


def test_request_id_propagated_when_provided():
    mock_response = httpx.Response(status_code=200, json={"status": "healthy"})
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        custom_id = "trace-client-abc-123"
        response = client.get("/health", headers={"X-Request-ID": custom_id})
        assert response.status_code == 200
        assert response.headers["x-request-id"] == custom_id


def test_cors_preflight_headers():
    response = client.options(
        "/api/v1/events",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization,Content-Type"
        }
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "GET" in response.headers.get("access-control-allow-methods", "")


def test_aggregated_health_check_all_up():
    mock_response = httpx.Response(status_code=200, json={"status": "healthy"})
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "api-gateway"
        assert data["dependencies"]["auth_service"] == "UP"
        assert data["dependencies"]["event_service"] == "UP"
        assert data["dependencies"]["booking_service"] == "UP"
        assert data["dependencies"]["notification_service"] == "UP"


def test_aggregated_health_check_degraded():
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        # Simulate auth down, others up
        async def mock_health_check(url, **kwargs):
            if "8001" in url:
                raise httpx.ConnectError("Connection refused")
            return httpx.Response(status_code=200, json={"status": "healthy"})

        mock_get.side_effect = mock_health_check

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["dependencies"]["auth_service"] == "DOWN"
        assert data["dependencies"]["event_service"] == "UP"


def test_proxy_auth_route():
    mock_downstream = httpx.Response(
        status_code=200,
        json={"success": True, "data": {"token": "sample-jwt"}},
        headers={"content-type": "application/json"}
    )
    with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = mock_downstream

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "alice@example.com", "password": "password123"},
            headers={"X-Request-ID": "req-auth-test"}
        )

        assert response.status_code == 200
        assert response.json()["data"]["token"] == "sample-jwt"
        assert response.headers["x-request-id"] == "req-auth-test"

        # Verify downstream request arguments
        mock_req.assert_called_once()
        call_kwargs = mock_req.call_args.kwargs
        assert call_kwargs["method"] == "POST"
        assert "http://127.0.0.1:8001/api/v1/auth/login" in call_kwargs["url"] or "http://localhost:8001/api/v1/auth/login" in call_kwargs["url"]
        assert call_kwargs["headers"]["X-Request-ID"] == "req-auth-test"


def test_proxy_events_query_parameters():
    mock_downstream = httpx.Response(
        status_code=200,
        json={"success": True, "data": {"events": [], "total": 0}},
        headers={"content-type": "application/json"}
    )
    with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = mock_downstream

        response = client.get("/api/v1/events?search=festival&page=2&limit=5")

        assert response.status_code == 200
        assert response.json()["data"]["total"] == 0

        mock_req.assert_called_once()
        call_url = mock_req.call_args.kwargs["url"]
        assert "search=festival" in call_url
        assert "page=2" in call_url
        assert "limit=5" in call_url


def test_proxy_timeout_error_normalization():
    with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_req:
        mock_req.side_effect = httpx.TimeoutException("Connection timed out")

        response = client.get("/api/v1/events/some-event-id", headers={"X-Request-ID": "timeout-req-1"})

        assert response.status_code == 504
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "GATEWAY_TIMEOUT"
        assert data["error"]["request_id"] == "timeout-req-1"
        assert response.headers["x-request-id"] == "timeout-req-1"


def test_proxy_connect_error_normalization():
    with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_req:
        mock_req.side_effect = httpx.ConnectError("Service unreachable")

        response = client.post("/api/v1/bookings", json={"event_id": "test", "quantity": 1})

        assert response.status_code == 502
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "BAD_GATEWAY"
        assert "x-request-id" in response.headers


def test_admin_dashboard_aggregation():
    mock_response = httpx.Response(status_code=200, json={"status": "healthy"})
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        response = client.get("/api/v1/admin/dashboard")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["data"]["summary"]["platform_status"] == "OPERATIONAL"
        assert body["data"]["services"]["auth"] == "ONLINE"
        assert body["data"]["services"]["events"] == "ONLINE"
