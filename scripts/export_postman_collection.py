"""
Export Postman Collection v2.1.0 for EventPass Microservices Platform.
Generates docs/eventpass-postman-collection.json with pre-configured requests,
environment variables, test scripts for auto-token injection, and SAGA flows.
"""

import json
from pathlib import Path


def build_collection():
    return {
        "info": {
            "_postman_id": "8a7c2f10-91a3-4816-b183-eventpass-api",
            "name": "EventPass Distributed Microservices API",
            "description": "Comprehensive Postman collection for EventPass Event Booking Microservices Platform (FastAPI, MySQL, RabbitMQ, SAGA pattern).",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "variable": [
            {"key": "baseUrl", "value": "http://localhost:8000", "type": "string"},
            {"key": "authToken", "value": "", "type": "string"},
            {"key": "refreshToken", "value": "", "type": "string"},
            {"key": "eventId", "value": "1", "type": "string"},
            {"key": "bookingId", "value": "1", "type": "string"},
        ],
        "item": [
            {
                "name": "1. Authentication & Security",
                "item": [
                    {
                        "name": "Register Customer Account",
                        "request": {
                            "method": "POST",
                            "header": [{"key": "Content-Type", "value": "application/json"}],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps(
                                    {
                                        "email": "customer@eventpass.local",
                                        "password": "Password123!",
                                        "full_name": "Demo Customer",
                                        "phone_number": "+15551234567",
                                        "role": "customer",
                                    },
                                    indent=2,
                                ),
                            },
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/auth/register",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "auth", "register"],
                            },
                        },
                    },
                    {
                        "name": "Verify Registration OTP",
                        "request": {
                            "method": "POST",
                            "header": [{"key": "Content-Type", "value": "application/json"}],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps(
                                    {
                                        "email": "customer@eventpass.local",
                                        "otp_code": "123456",
                                    },
                                    indent=2,
                                ),
                            },
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/auth/verify-otp",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "auth", "verify-otp"],
                            },
                        },
                    },
                    {
                        "name": "Login (Capture JWT)",
                        "event": [
                            {
                                "listen": "test",
                                "script": {
                                    "type": "text/javascript",
                                    "exec": [
                                        "var jsonData = pm.response.json();",
                                        "if (jsonData.data && jsonData.data.access_token) {",
                                        '    pm.collectionVariables.set("authToken", jsonData.data.access_token);',
                                        '    pm.collectionVariables.set("refreshToken", jsonData.data.refresh_token);',
                                        '    console.log("Captured JWT access_token:", jsonData.data.access_token);',
                                        "}",
                                    ],
                                },
                            }
                        ],
                        "request": {
                            "method": "POST",
                            "header": [{"key": "Content-Type", "value": "application/json"}],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps(
                                    {
                                        "email": "alice@example.com",
                                        "password": "Password123!",
                                    },
                                    indent=2,
                                ),
                            },
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/auth/login",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "auth", "login"],
                            },
                        },
                    },
                    {
                        "name": "Get Authenticated Profile",
                        "request": {
                            "method": "GET",
                            "header": [
                                {"key": "Authorization", "value": "Bearer {{authToken}}"}
                            ],
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/auth/me",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "auth", "me"],
                            },
                        },
                    },
                    {
                        "name": "Refresh Access Token",
                        "event": [
                            {
                                "listen": "test",
                                "script": {
                                    "type": "text/javascript",
                                    "exec": [
                                        "var jsonData = pm.response.json();",
                                        "if (jsonData.data && jsonData.data.access_token) {",
                                        '    pm.collectionVariables.set("authToken", jsonData.data.access_token);',
                                        '    pm.collectionVariables.set("refreshToken", jsonData.data.refresh_token);',
                                        "}",
                                    ],
                                },
                            }
                        ],
                        "request": {
                            "method": "POST",
                            "header": [{"key": "Content-Type", "value": "application/json"}],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps(
                                    {
                                        "refresh_token": "{{refreshToken}}",
                                    },
                                    indent=2,
                                ),
                            },
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/auth/refresh",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "auth", "refresh"],
                            },
                        },
                    },
                ],
            },
            {
                "name": "2. Event Catalog",
                "item": [
                    {
                        "name": "List Events (with Search & Pagination)",
                        "event": [
                            {
                                "listen": "test",
                                "script": {
                                    "type": "text/javascript",
                                    "exec": [
                                        "var jsonData = pm.response.json();",
                                        "if (jsonData.data && jsonData.data.items && jsonData.data.items.length > 0) {",
                                        '    pm.collectionVariables.set("eventId", jsonData.data.items[0].id);',
                                        "}",
                                    ],
                                },
                            }
                        ],
                        "request": {
                            "method": "GET",
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/events?page=1&limit=10&search=",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "events"],
                                "query": [
                                    {"key": "page", "value": "1"},
                                    {"key": "limit", "value": "10"},
                                    {"key": "search", "value": ""},
                                ],
                            },
                        },
                    },
                    {
                        "name": "Get Event Details",
                        "request": {
                            "method": "GET",
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/events/{{eventId}}",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "events", "{{eventId}}"],
                            },
                        },
                    },
                    {
                        "name": "List Event Categories",
                        "request": {
                            "method": "GET",
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/categories",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "categories"],
                            },
                        },
                    },
                    {
                        "name": "Admin: Create New Event",
                        "request": {
                            "method": "POST",
                            "header": [
                                {"key": "Content-Type", "value": "application/json"},
                                {"key": "Authorization", "value": "Bearer {{authToken}}"},
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps(
                                    {
                                        "title": "Quantum AI Summit 2026",
                                        "description": "Leading global conference exploring next-gen foundation models and quantum algorithms.",
                                        "category_id": 1,
                                        "venue": "Moscone Convention Center",
                                        "city": "San Francisco",
                                        "event_date": "2026-11-20T09:00:00",
                                        "total_seats": 250,
                                        "ticket_price": 499.00,
                                        "banner_url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
                                    },
                                    indent=2,
                                ),
                            },
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/events",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "events"],
                            },
                        },
                    },
                ],
            },
            {
                "name": "3. Booking & SAGA Orchestration",
                "item": [
                    {
                        "name": "Create Ticket Booking (Idempotent)",
                        "event": [
                            {
                                "listen": "prerequest",
                                "script": {
                                    "type": "text/javascript",
                                    "exec": [
                                        'var uuid = "idemp-" + Math.random().toString(36).substring(2) + "-" + Date.now();',
                                        'pm.variables.set("reqIdempotencyKey", uuid);',
                                    ],
                                },
                            },
                            {
                                "listen": "test",
                                "script": {
                                    "type": "text/javascript",
                                    "exec": [
                                        "var jsonData = pm.response.json();",
                                        "if (jsonData.data && jsonData.data.id) {",
                                        '    pm.collectionVariables.set("bookingId", jsonData.data.id);',
                                        "}",
                                    ],
                                },
                            },
                        ],
                        "request": {
                            "method": "POST",
                            "header": [
                                {"key": "Content-Type", "value": "application/json"},
                                {"key": "Authorization", "value": "Bearer {{authToken}}"},
                                {"key": "Idempotency-Key", "value": "{{reqIdempotencyKey}}"},
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps(
                                    {
                                        "event_id": 1,
                                        "num_tickets": 2,
                                        "idempotency_key": "{{reqIdempotencyKey}}",
                                    },
                                    indent=2,
                                ),
                            },
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/bookings",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "bookings"],
                            },
                        },
                    },
                    {
                        "name": "List Customer Bookings",
                        "request": {
                            "method": "GET",
                            "header": [
                                {"key": "Authorization", "value": "Bearer {{authToken}}"}
                            ],
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/bookings",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "bookings"],
                            },
                        },
                    },
                    {
                        "name": "Get Booking Details by ID",
                        "request": {
                            "method": "GET",
                            "header": [
                                {"key": "Authorization", "value": "Bearer {{authToken}}"}
                            ],
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/bookings/{{bookingId}}",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "bookings", "{{bookingId}}"],
                            },
                        },
                    },
                    {
                        "name": "Cancel Booking (SAGA Compensation)",
                        "request": {
                            "method": "POST",
                            "header": [
                                {"key": "Authorization", "value": "Bearer {{authToken}}"}
                            ],
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/bookings/{{bookingId}}/cancel",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "bookings", "{{bookingId}}", "cancel"],
                            },
                        },
                    },
                ],
            },
            {
                "name": "4. Notification & Communication",
                "item": [
                    {
                        "name": "List My Notifications",
                        "request": {
                            "method": "GET",
                            "header": [
                                {"key": "Authorization", "value": "Bearer {{authToken}}"}
                            ],
                            "url": {
                                "raw": "{{baseUrl}}/api/v1/notifications",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "v1", "notifications"],
                            },
                        },
                    },
                ],
            },
            {
                "name": "5. System Health & Observability",
                "item": [
                    {
                        "name": "Gateway Aggregated Health Check",
                        "request": {
                            "method": "GET",
                            "url": {
                                "raw": "{{baseUrl}}/health",
                                "host": ["{{baseUrl}}"],
                                "path": ["health"],
                            },
                        },
                    },
                    {
                        "name": "Auth Service Direct Health",
                        "request": {
                            "method": "GET",
                            "url": {
                                "raw": "http://localhost:8001/health",
                                "host": ["http://localhost:8001"],
                                "path": ["health"],
                            },
                        },
                    },
                    {
                        "name": "Event Service Direct Health",
                        "request": {
                            "method": "GET",
                            "url": {
                                "raw": "http://localhost:8002/health",
                                "host": ["http://localhost:8002"],
                                "path": ["health"],
                            },
                        },
                    },
                    {
                        "name": "Booking Service Direct Health",
                        "request": {
                            "method": "GET",
                            "url": {
                                "raw": "http://localhost:8003/health",
                                "host": ["http://localhost:8003"],
                                "path": ["health"],
                            },
                        },
                    },
                    {
                        "name": "Notification Service Direct Health",
                        "request": {
                            "method": "GET",
                            "url": {
                                "raw": "http://localhost:8004/health",
                                "host": ["http://localhost:8004"],
                                "path": ["health"],
                            },
                        },
                    },
                ],
            },
        ],
    }


def main():
    col = build_collection()
    out_path = Path(__file__).resolve().parent.parent / "docs" / "eventpass-postman-collection.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(col, f, indent=2)
    print(f"[OK] Generated Postman collection at: {out_path}")


if __name__ == "__main__":
    main()
