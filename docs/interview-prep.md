# Technical Interview Preparation Guide: Distributed Event Booking System

This guide covers real-world system design, distributed systems, database scaling, and security questions frequently asked during senior engineering and system architecture interviews based on this project.

---

## 1. System Design: Scaling to 100,000 Bookings / Second

### Question
*“Your current system uses MySQL atomic updates for seat reservations. If an ultra-popular concert (e.g., Taylor Swift or FIFA World Cup) goes on sale and 500,000 concurrent fans click 'Book' at the exact same second, MySQL row locks will become an insurmountable bottleneck. How would you redesign this architecture to handle 100,000 bookings per second without overselling?”*

### Comprehensive Answer & Architecture
```
[ 500,000 Fans ]
       │
       ▼ (Edge Layer)
[ Cloudflare / Envoy API Gateway ] ──> [ Virtual Waiting Room (Queue-It) ]
       │
       ▼ (Token Bucket Rate Limiting)
[ API Gateway Cluster (Go / Rust / FastAPI) ]
       │
       ▼ (Sub-millisecond In-Memory Inventory Check)
[ Redis Cluster (Sharded by event_id) ]
       │  Atomic Lua Script:
       │  if redis.call('get', KEYS[1]) >= ARGV[1] then
       │      redis.call('decrby', KEYS[1], ARGV[1])
       │      return 1
       │  else return 0 end
       │
       ▼ (Successful Reservations)
[ Apache Kafka (Partition Key: event_id) ]
       │  Topic: "ticket-reservations"
       │
       ▼ (Consumer Group - Controlled DB Ingestion)
[ Booking Settlement Workers ]
       │  Batch Writes: INSERT INTO bookings VALUES (...), (...)
       ▼
[ CockroachDB / MySQL Sharded Cluster ]
```

#### Key Architectural Pillars
1. **Virtual Waiting Room**:
   - Throttle client requests at the edge before they reach application servers. Queue users and admit them into the checkout funnel at a measured velocity matching our backpressure ceiling (e.g., 20,000 requests/second).
2. **In-Memory Inventory Metering via Redis & Lua Scripts**:
   - Relational database row-level locking (`SELECT ... FOR UPDATE` or conditional `UPDATE`) serializes transactions on a single row, creating lock wait timeouts.
   - In-memory key-value stores (Redis) process operations in memory on single-threaded event loops at ~100k ops/sec per shard.
   - A Redis Lua script atomically checks capacity and decrements in `<1ms`, ensuring no two threads can interleave.
3. **Asynchronous Settlement via Apache Kafka**:
   - Once Redis confirms an inventory hold, an event is produced to Kafka partitioned by `event_id`.
   - Dedicated consumer workers batch-insert records into sharded databases at a sustainable rate (e.g. 2,000 inserts per batch), completely protecting MySQL from connection pool exhaustion.
4. **Temporary Reservation Timeouts (TTL)**:
   - Hold inventory in Redis with a 10-minute TTL. If the user fails to complete payment, Redis automatically expires the reservation key and increments the pool without database writes.

---

## 2. Distributed Systems: Network Partitions & Failure Modes

### Question
*“What happens if the Booking Service reserves seats in the Event Service, but the network connection drops right before the Booking Service can write to MySQL or publish to RabbitMQ? How do you prevent orphaned reservations?”*

### Answer
This is a classic distributed systems failure scenario known as the **Dual-Write Problem**:

```
[ Booking Service ] ──(1. HTTP Reserve)──> [ Event Service ] (Seats: 10 -> 8)
        │
        ├── [ Network Crash / Timeout ] ❌
        ▼
   (Booking never written in DB; Event Service thinks seats are held!)
```

#### Solutions Implemented in this Project
1. **Idempotency Key Preservation**:
   - The client generates and sends `Idempotency-Key: <UUID>`.
   - When the client's HTTP request times out and retries, the Booking Service detects the key and checks whether a local record exists.
2. **Compensating Rollback (SAGA Pattern)**:
   - In `BookingService.create_booking`, the call to the Event Service is wrapped in a `try...except` block. If any downstream failure occurs (database write failure, RabbitMQ timeout), the service invokes the compensating endpoint:
   ```python
   try:
       db.commit()
   except Exception:
       db.rollback()
       event_client.release_tickets(req.event_id, req.quantity)
       raise HTTPException(status_code=500, detail="Booking transaction aborted. Inventory released.")
   ```
3. **Reconciliation Cron Job (TCC / Two-Phase Commit Alternative)**:
   - A background reconciliation worker periodically runs every 5 minutes:
   ```sql
   SELECT e.id, e.total_capacity, SUM(b.quantity) as booked_seats
   FROM events e
   LEFT JOIN bookings b ON b.event_id = e.id AND b.status = 'CONFIRMED'
   GROUP BY e.id;
   ```
   - If discrepancies exist between `SUM(b.quantity)` and `(total_capacity - available_capacity)`, the reconciliation worker safely corrects the drift.

---

## 3. Database Architecture: Decoupled DBs vs. Monolithic Joins

### Question
*“Why did you choose a Database-per-Service pattern instead of a shared schema? How do you generate an Admin Dashboard showing customer names, event titles, and booking revenue without being able to run an SQL `JOIN`?”*

### Answer

#### Why Database-per-Service?
1. **Schema Autonomy**: Changes to the Auth Service schema (e.g., adding WebAuthn or biometrics) can be deployed and migrated without taking down the Event Catalog or risking table locks.
2. **Blast Radius Isolation**: If a database outage affects `event_notification_db`, users can still browse events and book tickets uninterrupted.
3. **Independent Scaling**: The `event_catalog_db` experiences 95% reads (high read-replica caching), whereas `event_booking_db` experiences heavy write contention.

#### Handling Cross-Service Queries without SQL Joins
We employ two industry-standard patterns:
1. **API Composition Pattern (Used in API Gateway)**:
   - The Gateway queries the Booking Service for the list of bookings (`[ { event_id: 10, user_id: 5, ... } ]`).
   - The Gateway concurrently requests event metadata from the Event Service (`GET /api/v1/events?ids=10`) and user details from the Auth Service (`GET /api/v1/users?ids=5`).
   - It stitches the resulting objects in memory before returning the payload to the frontend.
2. **CQRS with Event-Carried State Transfer (For Higher Scale)**:
   - When an event is published or edited, Event Service broadcasts `event.updated` containing `{ id, title, venue, price }`.
   - The Booking Service consumes this event and stores denormalized read copies of `event_title` and `venue` inside its local `bookings` table.
   - Dashboards query the local denormalized table with zero cross-service network latency.

---

## 4. Security & Cryptography: Token Storage & Brute-Force Defense

### Question
*“Why did you choose Argon2id over bcrypt or PBKDF2? How does your refresh token rotation prevent token theft?”*

### Answer

#### Argon2id vs. bcrypt
- **Hardware Acceleration Resistance**: `bcrypt` is CPU-bound but uses fixed 4KB memory state. Attackers can build custom ASIC or GPU rigs to compute millions of bcrypt hashes per second.
- **Argon2id (Winner of the Password Hashing Competition)**:
  - Memory-hard algorithm configured in this project with:
    - `time_cost = 3` (3 iterations)
    - `memory_cost = 65536 KB` (64 MB of RAM required per attempt)
    - `parallelism = 4` (4 execution threads)
  - Requiring 64MB of RAM per attempt makes GPU and ASIC mass-cracking economically prohibitive.
  - The `id` hybrid variant provides resistance against both side-channel cache timing attacks and GPU parallelism.

#### Refresh Token Rotation & Theft Detection
```
1. Normal Flow:
   Client sends RefreshToken_A ──> Auth Service issues (AccessToken_2, RefreshToken_B)
   Auth Service marks RefreshToken_A as REVOKED.

2. Attack Scenario (Attacker stole RefreshToken_A before rotation):
   Attacker sends RefreshToken_A ──> Auth Service detects: "RefreshToken_A is ALREADY REVOKED!"
   Auth Service flags REUSE ATTACK:
   - Immediately revokes RefreshToken_B
   - Revokes entire family (family_id)
   - Forces immediate logout on all user devices
   - Logs security alert
```

---

## 5. Reliability: Dead-Letter Exchanges (DLX) & Poison Messages

### Question
*“What is a poisoned message in RabbitMQ, and how does your dead-letter queue prevent an infinite crash loop?”*

### Answer
- **The Problem**:
  - If a consumer fails to process a message (e.g., an invalid email format triggers an uncaught exception), a naive consumer rejects the message with `requeue=True`.
  - RabbitMQ immediately puts the message back at the head of the queue.
  - The consumer picks it up, crashes, rejects it, and loops infinitely at 100% CPU, starving all legitimate messages.
- **The Solution (DLX & DLQ Architecture)**:
  1. The `notification.jobs.queue` is configured with arguments:
     - `x-dead-letter-exchange`: `events.dlx`
     - `x-dead-letter-routing-key`: `notification.jobs.dlq`
  2. If a message fails after 3 retry attempts, the consumer rejects it with `requeue=False`.
  3. RabbitMQ automatically diverts the failed message into `notification.jobs.dlq`.
  4. The main queue resumes normal processing without latency.
  5. Engineers inspect the DLQ, fix the root cause, and replay messages via management CLI or administrative tool.
