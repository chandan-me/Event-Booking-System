# Event Booking System — Backend Services

This directory contains all backend microservices, shared contracts, database seed scripts, and test suites for the Event Booking System.

---

## Directory Structure

```
backend/
├── services/
│   ├── api-gateway/           # Port 8000: Edge gateway, routing & CORS
│   ├── auth-service/          # Port 8001: Argon2id auth, JWT rotation, OTP
│   ├── event-service/         # Port 8002: Catalog & atomic capacity reservation
│   ├── booking-service/       # Port 8003: Idempotent reservations & SAGA
│   └── notification-service/  # Port 8004: AMQP RabbitMQ consumer & Mailpit SMTP
├── shared/
│   └── contracts/             # Shared AMQP event schemas & DTOs
├── scripts/
│   ├── dev.py                 # Multi-service development process supervisor
│   ├── start-all.ps1          # Windows PowerShell launcher for all services
│   ├── stop-all.ps1           # Stops processes running on microservice ports
│   ├── seed_database.py       # Master database seeder & SQL dump exporter
│   ├── restore_seeded_db.py   # Restores database from infra/mysql/seeded_db.sql
│   ├── seed_demo_data.py      # Seeds demo users and events
│   └── db_ops.py              # Database diagnostics and checks
├── tests/
│   └── integration/           # End-to-end integration test suite
├── requirements.txt           # Python dependencies
├── pytest.ini                 # Pytest test discovery configuration
├── run_tests.py               # Automated test runner across all services
└── .env.example               # Backend environment variable template
```

---

## Service Port Registry

| Service | Port | Health / Swagger URL |
|---|---|---|
| **API Gateway** | `8000` | http://127.0.0.1:8000/docs |
| **Auth Service** | `8001` | http://127.0.0.1:8001/docs |
| **Event Service** | `8002` | http://127.0.0.1:8002/docs |
| **Booking Service** | `8003` | http://127.0.0.1:8003/docs |
| **Notification Service** | `8004` | http://127.0.0.1:8004/docs |

---

## Quick Start Commands (From `backend/` Directory)

### 1. Setup Virtual Environment & Install Dependencies
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```
*(If you already have a `.venv` in the repository root, you can activate that instead: `..\.venv\Scripts\activate`)*

### 2. Seed Demo Data & Initialize Databases
```powershell
python scripts/seed_demo_data.py
```

### 3. Run All Backend Services
**Option A: Python Supervisor (recommended with live logs):**
```powershell
python scripts/dev.py
```
*(Add `--with-frontend` to automatically launch Vite frontend at http://localhost:5173 as well!)*

**Option B: PowerShell Launcher:**
```powershell
.\scripts\start-all.ps1
```

### 4. Run Automated Test Suite
```powershell
python run_tests.py
```
or run individual service tests:
```powershell
pytest services/auth-service/tests
pytest services/event-service/tests
pytest services/booking-service/tests
pytest services/notification-service/tests
pytest services/api-gateway/tests
```

### 5. Stop All Running Services
```powershell
.\scripts\stop-all.ps1
```
