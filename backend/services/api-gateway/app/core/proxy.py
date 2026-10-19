import logging
from typing import Dict, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import httpx
from app.core.config import settings

logger = logging.getLogger("api_gateway.proxy")

# Headers that should not be forwarded directly downstream
EXCLUDED_REQUEST_HEADERS = {
    "host",
    "content-length",
}

# Headers that should not be copied back to client
EXCLUDED_RESPONSE_HEADERS = {
    "content-encoding",
    "content-length",
    "transfer-encoding",
    "connection",
}


_proxy_client: Optional[httpx.AsyncClient] = None


def get_proxy_client() -> httpx.AsyncClient:
    """Return a shared, connection-pooled AsyncClient for fast downstream forwarding."""
    global _proxy_client
    if _proxy_client is None or _proxy_client.is_closed:
        _proxy_client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.REQUEST_TIMEOUT_SECONDS, connect=4.0),
            limits=httpx.Limits(max_keepalive_connections=50, max_connections=200, keepalive_expiry=30.0)
        )
    return _proxy_client


async def forward_request(
    target_base_url: str,
    request: Request,
    path: str = ""
) -> Response:
    """
    Reverse-proxy an incoming HTTP request to an internal microservice:
    - Preserves HTTP method, headers, query string, cookies, and body.
    - Injects tracing headers: X-Request-ID and X-Forwarded-For.
    - Catches timeouts and connection errors, normalizing into standard JSON errors.
    """
    request_id = getattr(request.state, "request_id", "req-unknown")
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Reject path traversal attempts
    if ".." in path or "\\" in path:
        logger.warning(f"Path traversal attempt blocked: {path}")
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": {
                    "code": "BAD_REQUEST",
                    "message": "Invalid request path.",
                    "request_id": request_id,
                    "details": []
                }
            },
            headers={"X-Request-ID": request_id}
        )

    target_url = f"{target_base_url.rstrip('/')}/{path.lstrip('/')}"
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"

    # Build forwarded headers
    forward_headers: Dict[str, str] = {}
    for header, value in request.headers.items():
        if header.lower() not in EXCLUDED_REQUEST_HEADERS:
            forward_headers[header] = value

    forward_headers["X-Request-ID"] = request_id
    forward_headers["X-Forwarded-For"] = client_ip

    body = await request.body()

    try:
        client = get_proxy_client()
        downstream_res = await client.request(
            method=request.method,
            url=target_url,
            headers=forward_headers,
            content=body,
            cookies=request.cookies
        )

        # Build response headers
        response_headers: Dict[str, str] = {}
        for header, value in downstream_res.headers.items():
            if header.lower() not in EXCLUDED_RESPONSE_HEADERS:
                response_headers[header] = value

        response_headers["X-Request-ID"] = request_id

        return Response(
            content=downstream_res.content,
            status_code=downstream_res.status_code,
            headers=response_headers,
            media_type=downstream_res.headers.get("content-type")
        )

    except httpx.TimeoutException:
        logger.warning("Downstream timeout for %s %s -> %s", request.method, request.url.path, target_url)
        return JSONResponse(
            status_code=504,
            content={
                "success": False,
                "error": {
                    "code": "GATEWAY_TIMEOUT",
                    "message": "The downstream microservice did not respond in time.",
                    "request_id": request_id,
                    "details": []
                }
            },
            headers={"X-Request-ID": request_id}
        )
    except httpx.ConnectError:
        logger.error("Connection failed for %s %s -> %s", request.method, request.url.path, target_url)
        return JSONResponse(
            status_code=502,
            content={
                "success": False,
                "error": {
                    "code": "BAD_GATEWAY",
                    "message": "The downstream microservice is currently unavailable.",
                    "request_id": request_id,
                    "details": []
                }
            },
            headers={"X-Request-ID": request_id}
        )
    except Exception as e:
        logger.error("Unexpected error proxying to %s: %s", target_url, str(e))
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "GATEWAY_ERROR",
                    "message": "An error occurred while proxying your request.",
                    "request_id": request_id,
                    "details": []
                }
            },
            headers={"X-Request-ID": request_id}
        )
