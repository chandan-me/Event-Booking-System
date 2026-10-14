-- =====================================================================
-- DATABASE INITIALIZATION SCRIPT FOR EVENT BOOKING SYSTEM
-- This script runs once when the MySQL container starts with empty data.
-- Creates 4 logical databases for microservice isolation and an app user.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `event_auth_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `event_catalog_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `event_booking_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `event_notification_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application developer user if not exists
CREATE USER IF NOT EXISTS 'app_user'@'%' IDENTIFIED BY 'app_password_dev_only';

-- Grant permissions strictly to the service databases
GRANT ALL PRIVILEGES ON `event_auth_db`.* TO 'app_user'@'%';
GRANT ALL PRIVILEGES ON `event_catalog_db`.* TO 'app_user'@'%';
GRANT ALL PRIVILEGES ON `event_booking_db`.* TO 'app_user'@'%';
GRANT ALL PRIVILEGES ON `event_notification_db`.* TO 'app_user'@'%';

FLUSH PRIVILEGES;
