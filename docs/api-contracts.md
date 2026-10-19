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
| `POST` | `/api/v1/auth/register` | None | Register account (`CUSTOMER` or `ORGANIZER`), generate OTP |
| `POST` | `/api/v1/auth/verify-email` | None | Verify account using 6-digit OTP |
| `POST` | `/api/v1/auth/resend-otp` | None | Resend email OTP with cooldown enforcement |
| `POST` | `/api/v1/auth/login` | None | Authenticate with email/password; returns access token & sets refresh cookie |
| `POST` | `/api/v1/auth/refresh` | Cookie | Rotate refresh token and issue new access token |
| `POST` | `/api/v1/auth/logout` | Cookie/Bearer | Revoke refresh token and invalidate session |
| `POST` | `/api/v1/auth/forgot-password`| None | Request password reset OTP |
| `POST` | `/api/v1/auth/reset-password` | None | Reset password with verified OTP |
| `GET`  | `/api/v1/auth/me` | Bearer JWT | Retrieve currently authenticated user profile & role |

---

### B. Event Service (`/api/v1/events` & `/api/v1/categories`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/events` | None (Public) | Browse published events with filters & pagination |
| `GET` | `/api/v1/events/{event_id}` | None (Public) | Detailed information on single event |
| `GET` | `/api/v1/categories` | None (Public) | List all available event categories |
| `POST` | `/api/v1/events` | Organizer / Admin | Create a new event listing |
| `PATCH`| `/api/v1/events/{event_id}` | Organizer / Admin | Update event details, status, or capacity |
| `DELETE`| `/api/v1/events/{event_id}`| Organizer / Admin | Cancel or unpublish event |
| `GET`  | `/api/v1/organizer/events` | Organizer / Admin | List all events hosted by current organizer |
| `POST` | `/api/v1/organizer/events/{id}/add-seats` | Organizer / Admin | Dynamically expand capacity / add seating tiers |
| `GET`  | `/api/v1/internal/organizers/{id}/event-ids` | Internal Service | Get list of event IDs created by an organizer |
| `POST` | `/api/v1/internal/events/{id}/reserve` | Internal Service | Atomically decrement available capacity |
| `POST` | `/api/v1/internal/events/{id}/release` | Internal Service | Compensating inventory release on failure |

---

### C. Booking Service (`/api/v1/bookings`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/bookings` | Customer | Create booking with idempotency key |
| `POST` | `/api/v1/bookings/razorpay/order` | Customer | Create verified Razorpay payment order |
| `POST` | `/api/v1/bookings/razorpay/verify` | Customer | Verify Razorpay HMAC-SHA256 signature and issue confirmed tickets |
| `GET`  | `/api/v1/bookings/me` | Customer | View authenticated customer's booking history |
| `GET`  | `/api/v1/bookings/{booking_id}`| Customer / Admin | View single booking details (ownership enforced) |
| `POST` | `/api/v1/bookings/{booking_id}/cancel` | Customer / Admin | Cancel booking, revoke tickets, and release inventory |
| `POST` | `/api/v1/waiting-list` | Customer | Join priority waiting list for sold-out events |
| `GET`  | `/api/v1/waiting-list/me` | Customer | View customer's active waiting list entries |
| `DELETE`| `/api/v1/waiting-list/{id}` | Customer | Leave / cancel a waiting list entry |

---

### D. Organizer Portal Endpoints (`/api/v1/organizer`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET`  | `/api/v1/organizer/analytics` | Organizer / Admin | Aggregated KPI metrics: Gross Revenue, Tickets Sold, Emails, QRs, Check-Ins |
| `GET`  | `/api/v1/organizer/events` | Organizer / Admin | List all events hosted by current organizer |
| `POST` | `/api/v1/organizer/events/{id}/add-seats` | Organizer / Admin | Add extra seating tiers (VIP, Balcony, etc.) |
| `GET`  | `/api/v1/organizer/events/{id}/attendees` | Organizer / Admin | Attendee roster with QR references, payment data, and check-in status |
| `POST` | `/api/v1/organizer/check-in` | Organizer / Admin | Check in attendee via booking reference or ticket reference |
| `GET`  | `/api/v1/organizer/events/{id}/check-in-stats` | Organizer / Admin | Live door check-in statistics & occupancy rate |
| `GET`  | `/api/v1/organizer/waiting-list` | Organizer / Admin | View aggregated waiting list queue across hosted events |
| `PATCH`| `/api/v1/organizer/waiting-list/{id}/status` | Organizer / Admin | Update waitlist entry status (`WAITING`, `NOTIFIED`, `CONVERTED`) |

---

### E. Digital Tickets & QR Verification (`/api/v1/tickets`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET`  | `/api/v1/tickets/{ticket_id}` | Customer / Organizer / Admin | Retrieve full ticket e-pass with HMAC signed QR payload |
| `GET`  | `/api/v1/tickets/booking/{booking_ref}` | Customer / Organizer / Admin | Retrieve all digital tickets associated with a booking |
| `POST` | `/api/v1/tickets/verify` | None / Public | Verify cryptographic authenticity of a ticket QR code |
| `POST` | `/api/v1/tickets/scan-check-in` | Organizer / Admin | Live camera scanner check-in endpoint with duplicate scan detection |
| `GET`  | `/api/v1/tickets/events/{id}/check-in-stats` | Organizer / Admin | Door admission counter and attendance percentage |

---

### F. Admin Endpoints (`/api/v1/admin`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET`  | `/api/v1/admin/bookings` | Admin | List all bookings system-wide with status & date filters |
| `GET`  | `/api/v1/admin/dashboard`| Admin | High-level platform metrics: total revenue, active events, occupancy |
| `GET`  | `/api/v1/admin/waiting-list` | Admin | Platform-wide waiting list manager |
| `GET`  | `/api/v1/admin/audit-logs`| Admin | Administrative audit trail and system events |

---

### G. Health & Observability Endpoints
Every microservice exposes:
- `GET /health` : Liveness check (process responsive)
- `GET /health/ready` : Readiness check (database and broker connections verified)
- `GET http://127.0.0.1:8000/health` : Aggregated gateway health check probing all 5 downstream services
