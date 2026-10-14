# Architecture Decision Records (ADRs)

This document captures the foundational architectural choices, alternatives considered, trade-offs, and rationale guiding the Event Booking System.

---

## ADR-001: Microservices Architecture with Database-per-Service Pattern

### Status
Accepted

### Context
The platform manages four distinct operational domains: identity & access (`Auth`), event scheduling & capacity (`Event Catalog`), high-contention reservations & payment intent (`Booking`), and background messaging & delivery auditing (`Notification`). In a traditional monolith sharing a single database, high lock contention during ticket sales can degrade user authentication and event browsing.

### Decision
Implement four independent microservices with strictly decoupled logical/physical databases:
1. `event_auth_db`
2. `event_catalog_db`
3. `event_booking_db`
4. `event_notification_db`

Cross-database foreign key constraints and cross-service SQL `JOIN` queries are strictly prohibited. Inter-service relationships are represented via immutable logical scalar IDs (e.g. `user_id: 10`, `event_id: 100`).

### Consequences
- **Positive**:
  - Independent database scaling and zero blast-radius schema migrations.
  - Failures in the notification or booking system cannot lock or crash the auth or event catalog databases.
- **Negative / Trade-offs**:
  - Requires eventual consistency mechanisms.
  - Query aggregation (e.g. admin dashboards) requires API composition or asynchronous event streaming rather than a single SQL `JOIN`.

---

## ADR-002: Choreographed SAGA Pattern for Distributed Reservations

### Status
Accepted

### Context
When a user reserves tickets, two services must coordinate:
1. The `Event Service` must decrement seat inventory.
2. The `Booking Service` must create a confirmed reservation record.
3. If the booking record fails or is later cancelled by the customer, reserved capacity must be restored.

### Alternatives Considered
1. **Two-Phase Commit (2PC / XA Transactions)**: Requires distributed lock acquisition across both database engines. Blocks other transactions if network latency spikes. High probability of distributed deadlocks.
2. **Orchestrated SAGA with Central Orchestrator**: High overhead; requires maintaining a persistent workflow state machine engine for a straightforward two-step transaction.
3. **Choreographed SAGA with Direct Compensations**: Services invoke local transactions and execute compensating actions upon failure or cancellation.

### Decision
Adopt the **Choreographed SAGA Pattern**:
1. `Booking Service` synchronously invokes `POST /api/v1/internal/events/{id}/reserve` on the `Event Service`.
2. `Event Service` atomically reserves capacity and returns HTTP 200.
3. `Booking Service` commits the booking in `event_booking_db` and publishes `booking.created` to RabbitMQ.
4. If booking creation fails or the user cancels via `POST /api/v1/bookings/{id}/cancel`, `Booking Service` invokes `POST /api/v1/internal/events/{id}/release` on the `Event Service` to restore capacity.

### Consequences
- **Positive**: High throughput, no distributed locks, resilient to transient network partitions.
- **Negative / Trade-offs**: Requires implementing and testing compensating rollback endpoints for every mutation.

---

## ADR-003: JWT Refresh Token Rotation with Reuse Attack Detection

### Status
Accepted

### Context
Stateless JWT access tokens eliminate database lookups on every request, but if a token is stolen, the system cannot easily revoke it before expiration. Storing long-lived tokens in browser storage poses high security risks.

### Decision
Implement **Sliding Refresh Token Rotation**:
1. **Access Tokens**: Short-lived (15 minutes), stateless HMAC-SHA256 tokens carrying claims (`sub`, `role`, `email`).
2. **Refresh Tokens**: Long-lived (7 days), single-use cryptographic tokens stored in `event_auth_db` as SHA-256 hashes with an `is_revoked` flag and `family_id`.
3. **Rotation & Reuse Detection**:
   - Each refresh exchange issues a fresh access token AND a new refresh token, immediately revoking the old refresh token.
   - If an already-revoked refresh token is presented (indicating a replay or token theft attack), the Auth Service flags a breach and immediately revokes all tokens in that `family_id`, logging out all sessions for that account.

### Consequences
- **Positive**: Mitigates token theft windows to minutes; actively detects and neutralizes token leakage.
- **Negative / Trade-offs**: Frontend client must queue concurrent outbound requests while a refresh rotation is pending to prevent race conditions.

---

## ADR-004: Atomic Conditional SQL Updates for Concurrency Control

### Status
Accepted

### Context
During flash ticket sales (e.g., 100 tickets available with 1,000 concurrent buyers), simultaneous check-then-act read queries (`SELECT available_capacity FROM events ...`) will read stale values and oversell tickets.

### Decision
Implement database-level atomic conditional updates:
```sql
UPDATE events
SET available_capacity = available_capacity - :qty
WHERE id = :id AND available_capacity >= :qty;
```
Combined with a table-level check constraint:
```sql
ALTER TABLE events ADD CONSTRAINT chk_available_capacity_non_negative CHECK (available_capacity >= 0);
```

### Rationale
MySQL executes row updates atomically under row-level locking. If `available_capacity < :qty`, MySQL updates 0 rows (`rowcount == 0`), signaling immediate inventory exhaustion without requiring table-wide distributed locking.

### Consequences
- **Positive**: Zero overselling, mathematically guaranteed consistency, maximum throughput.
- **Negative / Trade-offs**: Buyers beyond capacity receive instant rejection rather than being queued (addressed in high-scale designs via Redis queues).

---

## ADR-005: Client-Supplied Idempotency Keys

### Status
Accepted

### Context
Network flakiness, client retries, or mobile reconnections during checkout can cause clients to resend `POST /api/v1/bookings`, resulting in double bookings and accidental duplicate charges.

### Decision
Enforce unique client idempotency keys via HTTP headers (`Idempotency-Key: <UUID>`) or JSON request bodies.
- `Booking Service` stores idempotency keys with a `UNIQUE` index in `event_booking_db`.
- If a duplicate key is encountered within a 24-hour window, the service bypasses the reservation pipeline and directly returns the original booking record with HTTP 200 OK.

### Consequences
- **Positive**: Completely eliminates duplicate reservations from automated network retries.
- **Negative / Trade-offs**: Requires persistent storage and periodic cleanup of idempotency keys.
