# Event Booking System — Full-Stack Microservices Project

A production-grade, distributed Event Booking System built with:
- **Frontend**: React, Vite, Material UI, Axios, React Router
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic, Argon2id, PyJWT
- **Messaging & Async**: RabbitMQ (`aio-pika`), SMTP email delivery
- **Databases**: MySQL (4 isolated logical microservice databases)
- **Architecture**: API Gateway + 4 domain microservices

---

## Architecture Overview

```
                      +-----------------------------+
                      | React Frontend (Vite, MUI)  |
                      |    http://localhost:5173    |
                      +--------------+--------------+
                                     |
                                     v HTTP
                      +-----------------------------+
                      |     API Gateway (FastAPI)   |
                      |    http://localhost:8000    |
                      +--------------+--------------+
                                     |
       +--------------------+--------+--------+--------------------+
       | HTTP               | HTTP            | HTTP               |
       v                    v                 v                    v
+--------------+     +--------------+  HTTP   +--------------+     +-------------------+
| Auth Service |     | Event Service|<------->|Booking Service|    |Notification Service|
|  Port: 8001  |     |  Port: 8002  |         |  Port: 8003  |    |     Port: 8004    |
+-------+------+     +-------+------+         +-------+------+     +---------+---------+
        |                    |                        |                      ^
        |                    |                        | AMQP Event           | AMQP Event
        |                    |                        +---------> RabbitMQ --+
        v                    v                                        |
  event_auth_db      event_catalog_db                         event_booking_db & notification_db
```

---

## Progress Checklist

- [x] **Phase 1: Requirements and Foundation** (Architecture, directory layout, git, .env.example, contracts)
- [x] **Phase 2: MySQL & Database Foundation** (Docker Compose, 4 logical DBs, SQLAlchemy, Alembic)
- [ ] **Phase 3: Auth Service** (Registration, Argon2id, OTP, SMTP, JWT access & refresh tokens)
- [ ] **Phase 4: Event Service** (CRUD, categories, filtering, atomic inventory reservation)
- [ ] **Phase 5: Booking Service** (Booking lifecycle, references, compensation, concurrency checks)
- [ ] **Phase 6: Notification Service** (RabbitMQ consumer, templates, retries, dead-letter queue)
- [ ] **Phase 7: API Gateway** (Reverse proxy routing, CORS, rate limits, centralized logging)
- [ ] **Phase 8: React Frontend** (Customer portal & Admin dashboard with Material UI)
- [ ] **Phase 9: Full Integration** (End-to-end workflows, concurrency verification, failure recovery)
- [ ] **Phase 10: Documentation & Deployment** (Complete setup guides, tests, interview review)

---

## Documentation Links
- [Architecture & Request Flows](file:///C:/Users/user/.gemini/antigravity-ide/scratch/event-booking-system/docs/architecture.md)
- [Database Design & Schemas](file:///C:/Users/user/.gemini/antigravity-ide/scratch/event-booking-system/docs/database-design.md)
- [API Contracts & Standards](file:///C:/Users/user/.gemini/antigravity-ide/scratch/event-booking-system/docs/api-contracts.md)
