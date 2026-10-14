# Event Booking System — Database Design

## 1. Database Isolation Principle
Each service operates with **strict schema ownership**. 
There are **no cross-database foreign keys** and **no cross-database joins**.

```
+-------------------+      +----------------------+      +--------------------+      +-------------------------+
|   event_auth_db   |      |   event_catalog_db   |      |  event_booking_db  |      |  event_notification_db  |
+-------------------+      +----------------------+      +--------------------+      +-------------------------+
| - users           |      | - event_categories   |      | - bookings         |      | - notification_records  |
| - email_otps      |      | - events             |      | - status_history   |      | - processed_messages    |
| - refresh_tokens  |      | - audit_logs         |      +--------------------+      +-------------------------+
| - password_resets |      +----------------------+
+-------------------+
```

---

## 2. Service Schemas

### A. Auth Service (`event_auth_db`)
1. **`users`**
   - `id`: BIGINT AUTO_INCREMENT PRIMARY KEY
   - `full_name`: VARCHAR(100) NOT NULL
   - `email`: VARCHAR(255) NOT NULL UNIQUE (indexed, normalized to lowercase)
   - `password_hash`: VARCHAR(255) NOT NULL (Argon2id)
   - `role`: VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER' (Enum: 'CUSTOMER', 'ADMIN')
   - `is_email_verified`: BOOLEAN NOT NULL DEFAULT FALSE
   - `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
   - `created_at`: DATETIME(6) UTC NOT NULL
   - `updated_at`: DATETIME(6) UTC NOT NULL

2. **`email_otps`**
   - `id`: BIGINT AUTO_INCREMENT PRIMARY KEY
   - `user_id`: BIGINT NOT NULL (FK -> `users.id`)
   - `purpose`: VARCHAR(50) NOT NULL ('VERIFY_EMAIL', 'PASSWORD_RESET')
   - `otp_hash`: VARCHAR(64) NOT NULL (SHA-256 hash of 6-digit code)
   - `attempts`: INT NOT NULL DEFAULT 0 (Max 5)
   - `expires_at`: DATETIME(6) UTC NOT NULL (5 minutes)
   - `consumed_at`: DATETIME(6) UTC NULL
   - `created_at`: DATETIME(6) UTC NOT NULL
   - *Index*: `(user_id, purpose, expires_at)`

3. **`refresh_tokens`**
   - `id`: BIGINT AUTO_INCREMENT PRIMARY KEY
   - `user_id`: BIGINT NOT NULL (FK -> `users.id`)
   - `token_hash`: VARCHAR(64) NOT NULL UNIQUE (SHA-256 hash of random token)
   - `expires_at`: DATETIME(6) UTC NOT NULL (7 days)
   - `revoked_at`: DATETIME(6) UTC NULL
   - `replaced_by`: VARCHAR(64) NULL (Points to successor token hash for rotation detection)
   - `created_at`: DATETIME(6) UTC NOT NULL

---

### B. Event Service (`event_catalog_db`)
1. **`event_categories`**
   - `id`: INT AUTO_INCREMENT PRIMARY KEY
   - `name`: VARCHAR(100) NOT NULL UNIQUE
   - `slug`: VARCHAR(100) NOT NULL UNIQUE

2. **`events`**
   - `id`: BIGINT AUTO_INCREMENT PRIMARY KEY
   - `title`: VARCHAR(255) NOT NULL
   - `slug`: VARCHAR(255) NOT NULL UNIQUE
   - `description`: TEXT NOT NULL
   - `category_id`: INT NOT NULL (FK -> `event_categories.id`)
   - `venue_name`: VARCHAR(255) NOT NULL
   - `venue_address`: VARCHAR(255) NOT NULL
   - `start_at`: DATETIME(6) UTC NOT NULL
   - `end_at`: DATETIME(6) UTC NOT NULL
   - `price`: DECIMAL(10, 2) NOT NULL DEFAULT 0.00
   - `currency`: VARCHAR(3) NOT NULL DEFAULT 'USD'
   - `total_capacity`: INT NOT NULL
   - `available_capacity`: INT NOT NULL
   - `status`: VARCHAR(20) NOT NULL DEFAULT 'DRAFT' ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED')
   - `created_by`: BIGINT NOT NULL (Auth user_id of Admin)
   - `created_at`: DATETIME(6) UTC NOT NULL
   - `updated_at`: DATETIME(6) UTC NOT NULL
   - *Constraints & Indexes*: 
     - CHECK (`available_capacity >= 0`)
     - CHECK (`total_capacity >= available_capacity`)
     - INDEX `idx_events_status_category_dates` (`status`, `category_id`, `start_at`)

---

### C. Booking Service (`event_booking_db`)
1. **`bookings`**
   - `id`: BIGINT AUTO_INCREMENT PRIMARY KEY
   - `booking_reference`: VARCHAR(32) NOT NULL UNIQUE (Indexed, e.g., `BK-20261014-9X4F`)
   - `customer_id`: BIGINT NOT NULL (Logical reference to Auth Service user)
   - `event_id`: BIGINT NOT NULL (Logical reference to Event Service event)
   - `quantity`: INT NOT NULL
   - `unit_price_snapshot`: DECIMAL(10, 2) NOT NULL
   - `total_amount_snapshot`: DECIMAL(10, 2) NOT NULL
   - `currency`: VARCHAR(3) NOT NULL DEFAULT 'USD'
   - `status`: VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' ('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED')
   - `idempotency_key`: VARCHAR(64) NOT NULL UNIQUE (Indexed)
   - `created_at`: DATETIME(6) UTC NOT NULL
   - `updated_at`: DATETIME(6) UTC NOT NULL
   - `cancelled_at`: DATETIME(6) UTC NULL
   - *Index*: `idx_bookings_customer_created` (`customer_id`, `created_at`)

2. **`booking_status_history`**
   - `id`: BIGINT AUTO_INCREMENT PRIMARY KEY
   - `booking_id`: BIGINT NOT NULL (FK -> `bookings.id`)
   - `previous_status`: VARCHAR(20) NULL
   - `new_status`: VARCHAR(20) NOT NULL
   - `reason`: VARCHAR(255) NULL
   - `changed_at`: DATETIME(6) UTC NOT NULL

---

### D. Notification Service (`event_notification_db`)
1. **`notification_records`**
   - `id`: BIGINT AUTO_INCREMENT PRIMARY KEY
   - `event_type`: VARCHAR(50) NOT NULL ('VERIFY_EMAIL', 'PASSWORD_RESET', 'BOOKING_CONFIRMATION', 'BOOKING_CANCELLATION')
   - `recipient`: VARCHAR(255) NOT NULL
   - `status`: VARCHAR(20) NOT NULL DEFAULT 'PENDING' ('PENDING', 'SENT', 'FAILED')
   - `attempts`: INT NOT NULL DEFAULT 0
   - `last_error`: TEXT NULL
   - `created_at`: DATETIME(6) UTC NOT NULL
   - `sent_at`: DATETIME(6) UTC NULL

2. **`processed_messages`**
   - `message_id`: VARCHAR(64) PRIMARY KEY (Unique UUID published by producer)
   - `processed_at`: DATETIME(6) UTC NOT NULL
