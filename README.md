# EventPass — Production-Grade Event Booking & Operations Platform

A distributed, enterprise-grade Event Booking, Ticketing, and Live Operations platform built with a microservices architecture, asynchronous event-driven SAGA transactions, Razorpay payments, cryptographic digital QR passes, and an in-browser live admission scanner.

---

## ⚡ 5-Minute Collaborator Quickstart

Welcome! Follow these simple steps to get the entire platform up, seeded, and running on your local machine.

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Python 3.12+** ([python.org](https://www.python.org/downloads/))
- **Node.js v20+ & npm** ([nodejs.org](https://nodejs.org/))
- **Docker Desktop** (running for RabbitMQ & Mailpit, or MySQL if not installed locally)
- *(Optional)* **MySQL 8.0** locally on port `3306` (if not running MySQL in Docker)

---

### 2. Environment Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd event-booking-system
   ```

2. **Set up Python Virtual Environment**:
   ```powershell
   # Create virtual environment (if not already created)
   python -m venv .venv

   # Activate virtual environment
   .\.venv\Scripts\Activate.ps1   # On Windows PowerShell
   # source .venv/bin/activate    # On macOS / Linux

   # Install dependencies
   pip install -r backend/requirements.txt
   ```

3. **Install Frontend Dependencies**:
   ```powershell
   cd frontend
   npm install
   cd ..
   ```

---

### 3. Database Seeding & Initialization

We provide pre-seeded test data (Admin, Organizer, and Attendee accounts, live categories, curated events with INR pricing, sample confirmed bookings, digital QR tickets, and check-in records).

**Run the database seeder with one command:**

```powershell
# Using PowerShell:
.\seed.ps1

# OR using Windows CMD:
seed.bat

# OR using Python directly:
python backend/scripts/seed_database.py --dump
```

> **What does this do?**
> - Connects to MySQL on port `3306`
> - Verifies/creates tables for all 4 microservice databases
> - Seeds verified demo users matching the credentials below
> - Seeds live events linked to the demo organizer
> - Seeds sample bookings and digital QR tickets (ready for scanning)
> - Exports the fresh dump to `infra/mysql/seeded_db.sql`

---

### 4. Start the Entire Platform

Launch Docker infrastructure (RabbitMQ, Mailpit, MySQL), all 5 backend microservices, and the React frontend with a single command:

```powershell
# Using PowerShell:
.\start.ps1

# OR using Windows CMD:
start.bat

# OR with Python directly:
python main.py
```

*The runner automatically launches all services, confirms database connectivity, and opens your browser to [http://localhost:5173](http://localhost:5173).*

### 5. Stopping the Platform
Press `Ctrl + C` in your terminal, or run:
```powershell
.\stop.ps1
```

---

## 👥 Default Test Accounts & Login

On the Login screen ([http://localhost:5173/login](http://localhost:5173/login)), we have included **⚡ Quick Fill Demo Accounts** buttons so you can log in with a single click without typing credentials!

| Role | Email Address | Password | Portal / URL | Access Scope |
|---|---|---|---|---|
| **Platform Administrator** | `admin@eventpass.com` | `AdminPass@123` | [`/admin`](http://localhost:5173/admin) | Full system control, global metrics, platform audit logs |
| **Verified Event Host** | `organizer@eventpass.com` | `OrganizerPass@123` | [`/organizer/dashboard`](http://localhost:5173/organizer/dashboard) | Live event hub, dynamic seat add-ons, in-browser QR camera scanner, live attendee roster |
| **Customer / Attendee** | `user@eventpass.com` | `UserPass@123` | [`/bookings`](http://localhost:5173/bookings) | Ticket purchasing, Razorpay checkout, digital pass wallet |

*(Both `.com` and `.io` domains e.g. `admin@eventpass.io` work interchangeably with the same passwords).*

---

## 🔌 Service Port Registry & Dashboards

| Service / Component | Port | Protocol | Purpose | Swagger Docs / Web UI |
|---|---|---|---|---|
| **React Frontend SPA** | `5173` | HTTP | Vite + React 19 + MUI portal | [http://localhost:5173](http://localhost:5173) |
| **API Gateway** | `8000` | HTTP | Central ingress, routing, CORS, request tracing | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |
| **Auth Service** | `8001` | HTTP | Argon2id auth, role JWTs, email OTP verification | [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs) |
| **Event Service** | `8002` | HTTP | Event catalog, capacity allocation, seat tiers | [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs) |
| **Booking Service** | `8003` | HTTP | Razorpay checkout, SAGA transactions, QR passes | [http://127.0.0.1:8003/docs](http://127.0.0.1:8003/docs) |
| **Notification Service** | `8004` | HTTP/AMQP | RabbitMQ consumer, HTML ticket email dispatch | [http://127.0.0.1:8004/docs](http://127.0.0.1:8004/docs) |
| **Mailpit Web UI** | `8025` | HTTP | Local inbox previewing OTPs and ticket emails | [http://localhost:8025](http://localhost:8025) |
| **RabbitMQ Management** | `15672` | HTTP | Queue monitoring & exchanges (`guest`/`guest`) | [http://localhost:15672](http://localhost:15672) |
| **MySQL Database** | `3306` | TCP | 4 decoupled microservice databases | `localhost:3306` |

---

## 🏛️ System Architecture

```
                      +-----------------------------+
                      | React Frontend (Vite, MUI)  |
                      |    http://localhost:5173    |
                      +--------------+--------------+
                                     |
                                     v HTTP (X-Request-ID, Bearer JWT)
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

## 🎯 Key Interactive Features for Collaborators to Test

### 1. In-Browser Live Camera QR Scanner
1. Log in as **Event Host** (`organizer@eventpass.com` / `OrganizerPass@123`).
2. Navigate to **Organizer Dashboard** (`/organizer/dashboard`).
3. Click **"Open QR Scanner"**:
   - Point your webcam at a ticket QR pass, OR
   - Enter one of the pre-seeded active ticket references:
     - `TKT-DEMO-202610-002`
     - `TKT-DEMO-202610-003`
4. Notice instant verification, audio chime, and attendee check-in confirmation!
5. Try submitting the same ticket again: duplicate entry is immediately detected and rejected!

### 2. Real-Time Dynamic Seat Add-Ons
1. On the Organizer Dashboard, find an event card.
2. Click **"Add Seats / Configure Tiers"**.
3. Select an additional capacity (e.g. `+50` seats) and configure seating tier labels.
4. Confirm: capacity is dynamically updated across the event service catalog and live ticket counts adjust immediately.

### 3. Live Attendee Roster & CSV Export
1. On the Organizer Dashboard, switch to the **"Attendee Roster"** tab.
2. Search attendees by name, email, or ticket reference.
3. Filter by `Checked In` vs `Pending Admission`.
4. Click **"Export Roster (.csv)"** to download the manifest.

### 4. Razorpay Checkout & Digital Pass Wallet
1. Log in as **Attendee** (`user@eventpass.com` / `UserPass@123`).
2. Browse events on the home page, select tickets, and click **"Proceed to Checkout"**.
3. In dev mode, Razorpay test payment automatically verifies and creates digital QR tickets.
4. Visit **"My Bookings"** (`/bookings`) to view digital passes and download PDF/print e-passes.

### 5. Email Sandbox & OTP Verification
- Any registration OTP or ticket confirmation email is sent to **Mailpit**.
- Open [http://localhost:8025](http://localhost:8025) in your browser to view all incoming emails and grab 6-digit OTP codes.

---

## 🗄️ Database Operations & Seeding Options

Collaborators have multiple options to manage the databases:

### Option A: One-Click Seeder (Recommended)
```powershell
.\seed.ps1
# or
seed.bat
```

### Option B: Seeding with Python
```powershell
python backend/scripts/seed_database.py --dump
```

### Option C: Restoring the Raw SQL Dump (`infra/mysql/seeded_db.sql`)
```powershell
python backend/scripts/restore_seeded_db.py
```

### Option D: Database Health Diagnostics & Row Counts
```powershell
python backend/scripts/db_ops.py --stats
```

---

## 🧪 Running Automated Tests

Run the full test suite across all microservices:
```powershell
# Using the backend runner:
cd backend
python run_tests.py
```

Or test specific services individually:
```powershell
# Booking Service tests (SAGA, Razorpay, QR verification):
pytest backend/services/booking-service/tests/ -v

# Auth Service tests (Argon2id, OTP, JWTs):
pytest backend/services/auth-service/tests/ -v

# Event Service tests (Capacity, Category filters):
pytest backend/services/event-service/tests/ -v

# API Gateway tests (Routing, Headers):
pytest backend/services/api-gateway/tests/ -v

# Notification Service tests:
pytest backend/services/notification-service/tests/ -v
```

---

## ❓ Collaborator FAQs & Troubleshooting

### Q: Port 8000, 8001, or 5173 is already in use?
**Fix:** Run `.\stop.ps1` in PowerShell. It automatically terminates any orphaned processes holding ports 8000–8004 and 5173.

### Q: I cannot connect to MySQL (`localhost:3306`)?
**Fix:** 
- If using Docker: make sure Docker Desktop is running and run `docker compose up -d mysql`.
- If using local MySQL: make sure the MySQL service is started in Windows Services (`services.msc`) or run `net start MySQL80`.
- Verify credentials in `.env`: default user is `app_user` with password `app_password_dev_only`.

### Q: How do I completely wipe and reset the databases?
**Fix:** Run `python backend/scripts/seed_database.py --dump`. It re-synchronizes all tables, accounts, categories, events, and bookings to a clean state.

---

## 📁 Repository Structure

```
event-booking-system/
├── backend/
│   ├── services/
│   │   ├── api-gateway/            # Central router, CORS, request tracing, health probes
│   │   ├── auth-service/           # User authentication, Argon2id, OTP verification, JWTs
│   │   ├── event-service/          # Catalog management, search/filters, seating tiers
│   │   ├── booking-service/        # Razorpay payments, QR ticket generation, organizer analytics
│   │   └── notification-service/   # RabbitMQ consumer, email templates, dead-letter queue
│   ├── shared/                     # Shared event schemas and SAGA contracts
│   ├── scripts/
│   │   ├── seed_database.py        # Comprehensive database seeder & SQL dump exporter
│   │   ├── restore_seeded_db.py    # SQL dump importer
│   │   ├── db_ops.py               # Database diagnostics and row count inspector
│   │   ├── dev.py                  # Backend process supervisor
│   │   └── export_postman_collection.py # Postman API documentation exporter
│   ├── tests/                      # Microservice unit, integration, and E2E test suites
│   ├── requirements.txt            # Python dependencies
│   └── run_tests.py                # Isolated test suite runner
├── frontend/                       # Vite + React 19 + Material-UI Single Page Application
│   ├── src/
│   │   ├── api/                    # Axios API clients for Gateway endpoints
│   │   ├── components/             # Reusable UI components (Navbar, Footer, Modals)
│   │   ├── context/                # AuthContext and state providers
│   │   ├── pages/                  # Page views (OrganizerDashboard, Admin, Events, Booking)
│   │   └── theme/                  # Material-UI custom design tokens & palettes
├── infra/                          # Infrastructure definitions (MySQL init, seeded SQL, Mailpit, K8s)
│   └── mysql/
│       ├── init.sql                # Empty database and user creation script
│       └── seeded_db.sql           # Complete pre-seeded MySQL dump (users, events, tickets)
├── docs/                           # Architecture specs, ADRs, database diagrams, API contracts
├── main.py                         # Master process orchestrator
├── seed.ps1 / seed.bat             # One-click database seeders
├── start.ps1 / start.bat           # Master launchers
└── stop.ps1 / stop.bat             # Graceful teardown scripts
```

---

## 📚 Technical Documentation & Deep Dives

- **[API Contracts & Endpoint Catalogue](docs/api-contracts.md)**: Full endpoint reference, payload structures, and error codes.
- **[Architecture & Request Flows](docs/architecture.md)**: SAGA pattern, choreography, distributed transactions.
- **[Database Design & Schemas](docs/database-design.md)**: ER diagrams, isolated database models, migration strategies.
- **[Architecture Decision Records (ADRs)](docs/architecture-decision-records.md)**: Design trade-offs and rationale.
- **[Senior Technical Interview Prep Guide](docs/interview-prep.md)**: Deep-dive answers on microservices, idempotency, and concurrency control.
- **[Kubernetes Deployment Guide](infra/k8s/README.md)**: Production manifests, Ingress, and Horizontal Pod Autoscalers.
