# Event Booking System — API Contracts & Standards

All public APIs are exposed through the **API Gateway** (`http://localhost:8000`) with the prefix `/api/v1`.

---

## 1. Standard API Responses

### Standard Success Response (200 OK / 201 Created)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Standard Error Response (4xx / 5xx)
Every service and the gateway return a normalized error structure:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_INVENTORY",
    "message": "Only 1 ticket remaining, but 2 were requested.",
    "request_id": "req-9a8f27c3-56b1-4f4b-85d9-7e5ec0d3e5b6",
    "details": [
      {
        "field": "quantity",
        "issue": "Requested quantity exceeds available capacity"
      }
    ]
  }
}
```

---

## 2. API Endpoint Catalogue

### A. Auth Service (`/api/v1/auth`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | None | Register a customer account, generate OTP |
| `POST` | `/api/v1/auth/verify-email` | None | Verify account using 6-digit OTP |
| `POST` | `/api/v1/auth/resend-otp` | None | Resend email OTP with cooldown enforcement |
| `POST` | `/api/v1/auth/login` | None | Authenticate with email/password; returns access token & sets refresh cookie |
| `POST` | `/api/v1/auth/refresh` | Cookie | Rotate refresh token and issue new access token |
| `POST` | `/api/v1/auth/logout` | Cookie/Bearer | Revoke refresh token and invalidate session |
| `POST` | `/api/v1/auth/forgot-password`| None | Request password reset OTP |
| `POST` | `/api/v1/auth/reset-password` | None | Reset password with verified OTP |
| `GET`  | `/api/v1/auth/me` | Bearer JWT | Retrieve currently authenticated user profile |

---

### B. Event Service (`/api/v1/events` & `/api/v1/categories`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/events` | None (Public) | Browse published events with filters & pagination |
| `GET` | `/api/v1/events/{event_id}` | None (Public) | Detailed information on single event |
| `GET` | `/api/v1/categories` | None (Public) | List all available event categories |
| `POST` | `/api/v1/events` | Admin | Create a new event draft or published event |
| `PATCH`| `/api/v1/events/{event_id}` | Admin | Update event details, status, or capacity |
| `DELETE`| `/api/v1/events/{event_id}`| Admin | Cancel or unpublish event |
| `POST` | `/api/v1/internal/events/{id}/reserve` | Internal Service | Atomically decrement available capacity |
| `POST` | `/api/v1/internal/events/{id}/release` | Internal Service | Compensating inventory release on failure |

---

### C. Booking Service (`/api/v1/bookings`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/bookings` | Customer | Create booking with idempotency key |
| `GET` | `/api/v1/bookings/me` | Customer | View authenticated customer's booking history |
| `GET` | `/api/v1/bookings/{booking_id}`| Customer/Admin | View single booking details (ownership enforced) |
| `POST` | `/api/v1/bookings/{booking_id}/cancel` | Customer/Admin | Cancel booking and trigger inventory release |

---

### D. Admin Endpoints (`/api/v1/admin`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/bookings` | Admin | List bookings across all events with status/date filters |
| `GET` | `/api/v1/admin/dashboard`| Admin | High-level metrics: total revenue, active events, occupancy |
| `GET` | `/api/v1/admin/audit-logs`| Admin | Review administrative action audit logs |

---

### E. Health Endpoints
Every service exposes:
- `GET /health` : Liveness check (service process is running)
- `GET /health/ready` : Readiness check (database and broker connections are healthy)
