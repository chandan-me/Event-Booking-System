# Event Booking System — Full-Stack Microservices Project

A production-grade, distributed Event Booking System built with:
- **Frontend**: React 19, Vite, Material UI, Axios, React Router, Notistack
- **Backend Microservices**: Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic, Argon2id, PyJWT
- **Messaging & Event-Driven SAGA**: RabbitMQ (`aio-pika`), Dead-Letter Exchanges (DLX/DLQ)
- **Databases**: MySQL 8.0 (4 decoupled logical/physical microservice databases)
- **Infrastructure**: API Gateway, Docker & Docker Compose, Windows 11 PowerShell orchestration

---

## Architecture Overview

```
                      +-----------------------------+
                      | React Frontend (Vite, MUI)  |
                      |    http://localhost:5173    |
                      +--------------+--------------+
                                     |
                                     v HTTP (X-Request-ID, JWT)
                      +-----------------------------+
                      |     API Gateway (FastAPI)   |
                      |    http://localhost:8000    |
                      +--------------+--------------+
                                     |
       +--------------------+--------+--------+--------------------+
       | HTTP               | HTTP            | HTTP               | HTTP
       v                    v                 v                    v
+--------------+     +--------------+  HTTP   +--------------+     +-------------------+
| Auth Service |     | Event Service|<------->|Booking Service|    |Notification Service|
|  Port: 8001  |     |  Port: 8002  | (SAGA)  |  Port: 8003  |    |     Port: 8004    |
+-------+------+     +-------+------+         +-------+------+     +---------+---------+
        |                    |                        |                      ^
        |                    |                        | AMQP Event           | AMQP Event
        |                    |                        +---------> RabbitMQ --+
        v                    v                                        |
  event_auth_db      event_catalog_db                         event_booking_db & notification_db
```

---

## Service Port Registry

| Service | Port | Protocol | Purpose |
|---|---|---|---|
| **API Gateway** | `8000` | HTTP / REST | Single public entry point, CORS, routing, request tracing, health probe |
| **Auth Service** | `8001` | HTTP / REST | Argon2id registration, email OTP verification, JWT sliding refresh rotation |
| **Event Service** | `8002` | HTTP / REST | Catalog browsing, filtering, search, atomic conditional capacity reservation |
| **Booking Service** | `8003` | HTTP / REST | Idempotent reservations, SAGA compensation, customer ledger, cancellations |
| **Notification Service** | `8004` | HTTP / AMQP | RabbitMQ queue consumer, responsive HTML email delivery, audit logging |
| **React Frontend** | `5173` | HTTP | Vite React SPA with dark mode, interactive booking modal, admin console |
| **MySQL Database** | `3306` | TCP | 4 isolated logical databases (`auth`, `catalog`, `booking`, `notification`) |
| **RabbitMQ AMQP** | `5672` | AMQP | Event bus topic exchange (`events.topic`) |
| **RabbitMQ Management** | `15672` | HTTP | Management web interface (`guest`/`guest`) |
| **Mailpit Web UI** | `8025` | HTTP | Local inbox previewing sent HTML emails |

---

## Quick Start Guide

### Prerequisites
- Python 3.12+
- Node.js v20+ & npm
- MySQL 8.0 (running locally on port 3306 or via Docker)

---

### Option A: Local Development (Windows 11 / Linux)

1. **Setup Python Virtual Environment**:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Initialize Databases & Seed Demo Data**:
   ```powershell
   # Populates demo users (admin@eventbooking.com / alice@example.com) and 6 live events
   python scripts/seed_demo_data.py
   ```

3. **Start All Services Concurrently**:
   ```powershell
   # Using the Python process supervisor with colorized interleaved logs:
   python scripts/dev.py --with-frontend

   # OR using native Windows PowerShell:
   .\scripts\start-all.ps1
   ```

4. **Access the System**:
   - **Frontend Application**: [http://localhost:5173](http://localhost:5173)
   - **API Gateway Swagger**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - **Aggregated Health Probe**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

5. **Stop All Services**:
   ```powershell
   .\scripts\stop-all.ps1
   ```

---

### Option B: Docker Compose Deployment

To build and run all 6 microservices and infrastructure containers:
```bash
docker compose up --build -d
```
- Frontend SPA: [http://localhost:3000](http://localhost:3000)
- API Gateway: [http://localhost:8000](http://localhost:8000)
- RabbitMQ UI: [http://localhost:15672](http://localhost:15672)
- Mailpit UI: [http://localhost:8025](http://localhost:8025)

---

## Automated Test Suites

Run all microservice test suites in isolated subprocesses:
```powershell
python run_tests.py
```

Run specific test suites:
```powershell
# Run API Gateway tests
pytest services/api-gateway/tests -v

# Run End-to-End integration test
pytest tests/integration/test_end_to_end_journey.py -v
```

---

## Project Roadmap & Status

- [x] **Phase 1: Requirements and Foundation** (Architecture docs, directory layout, git, .env.example, contracts)
- [x] **Phase 2: MySQL & Database Foundation** (Docker Compose, 4 logical DBs, SQLAlchemy 2.x, Alembic)
- [x] **Phase 3: Auth Service** (Registration, Argon2id, OTP, SMTP, JWT access & refresh rotation, tests)
- [x] **Phase 4: Event Service** (CRUD, categories, filtering, atomic inventory reservation, race tests)
- [x] **Phase 5: Booking Service** (Booking lifecycle, references, compensation, concurrency checks)
- [x] **Phase 6: Notification Service** (RabbitMQ consumer, HTML templates, retries, dead-letter queue)
- [x] **Phase 7: API Gateway** (Reverse proxy routing, CORS, aggregated health checks, error normalization)
- [x] **Phase 8: React Frontend** (Customer portal, ticket modal, user reservations, admin console, Material UI)
- [x] **Phase 9: Full Integration** (End-to-end customer journey, demo data seeder, process supervisor, SAGA tests)
- [x] **Phase 10: Documentation & Deployment** (Dockerfiles, compose.yaml, ADRs, interview prep, master README)

---

## Documentation Links

- [Architecture & Request Flows](docs/architecture.md)
- [Database Design & Schemas](docs/database-design.md)
- [API Contracts & Standards](docs/api-contracts.md)
- [Architecture Decision Records (ADRs)](docs/architecture-decision-records.md)
- [Senior Technical Interview Prep Guide](docs/interview-prep.md)
