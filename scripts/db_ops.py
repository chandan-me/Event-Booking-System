"""
Database Operations & Health Diagnostics CLI for EventPass Microservices Platform.
Inspects all 4 decoupled databases, verifies table integrity, row counts, and connection health.

Usage:
    python scripts/db_ops.py --check
    python scripts/db_ops.py --stats
"""

import argparse
import os
import sys
import time
from sqlalchemy import create_engine, text

DATABASES = [
    {
        "name": "Auth Service DB",
        "url": os.getenv("AUTH_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_auth_db"),
        "expected_tables": ["users", "refresh_tokens", "email_otps"],
    },
    {
        "name": "Event Catalog DB",
        "url": os.getenv("EVENT_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_catalog_db"),
        "expected_tables": ["events", "event_categories"],
    },
    {
        "name": "Booking SAGA DB",
        "url": os.getenv("BOOKING_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_booking_db"),
        "expected_tables": ["bookings", "booking_status_history"],
    },
    {
        "name": "Notification DB",
        "url": os.getenv("NOTIFICATION_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_notification_db"),
        "expected_tables": ["notification_records", "processed_messages"],
    },
]


def inspect_databases(stats_only: bool = False) -> bool:
    print("=" * 70)
    print("EVENTPASS DATABASE DIAGNOSTICS & HEALTH CHECK")
    print("=" * 70)

    all_passed = True
    total_tables = 0
    total_records = 0

    for db in DATABASES:
        engine = create_engine(db["url"], pool_pre_ping=True)
        db_clean_url = db["url"].split("@")[-1]

        t0 = time.perf_counter()
        try:
            with engine.connect() as conn:
                latency_ms = (time.perf_counter() - t0) * 1000
                res = conn.execute(text("SHOW TABLES;"))
                tables = [r[0] for r in res.fetchall()]

                table_stats = []
                for tbl in tables:
                    count_res = conn.execute(text(f"SELECT COUNT(*) FROM `{tbl}`;"))
                    cnt = count_res.scalar()
                    table_stats.append((tbl, cnt))
                    total_records += cnt

                total_tables += len(tables)

                missing = [t for t in db["expected_tables"] if t not in tables]
                status_str = "[HEALTHY]" if not missing else "[WARNING]"
                if missing:
                    all_passed = False

                print(f"\n{status_str} {db['name']} ({db_clean_url}) - Ping: {latency_ms:.2f}ms")
                print(f"  Active Tables ({len(tables)}):")
                for tbl, cnt in table_stats:
                    marker = " * " if tbl in db["expected_tables"] else "   "
                    print(f"  {marker}{tbl:<24} : {cnt} rows")

                if missing:
                    print(f"  [!] Missing expected tables: {missing}")

        except Exception as exc:
            all_passed = False
            print(f"\n[FAILED] {db['name']} ({db_clean_url}): {exc}")
        finally:
            engine.dispose()

    print("\n" + "=" * 70)
    print(f"SUMMARY: 4/4 Logical DBs Inspected | Total Tables: {total_tables} | Total Records: {total_records}")
    print(f"Status: {'ALL SYSTEMS HEALTHY' if all_passed else 'SOME CHECKS FAILED'}")
    print("=" * 70)

    return all_passed


def main():
    parser = argparse.ArgumentParser(description="EventPass Database Diagnostic CLI")
    parser.add_argument("--check", action="store_true", help="Run quick automated health check and exit with status code")
    parser.add_argument("--stats", action="store_true", help="Display full table row counts")
    args = parser.parse_args()

    success = inspect_databases(stats_only=args.stats)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
