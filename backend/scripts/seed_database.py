"""
======================================================================
EVENTPASS — COMPREHENSIVE DATABASE SEED & INITIALIZATION CLI
======================================================================
Seeds all 4 microservice databases with enterprise-ready demo data:
  1. Auth Service DB: Verified Admin, Organizer, and Attendee accounts
  2. Event Catalog DB: Professional Categories & Curated Live Events
  3. Booking Service DB: Confirmed Bookings, Digital Tickets & QR passes
  4. Notification Service DB: Dispatch records & audit logs

Usage:
  python backend/scripts/seed_database.py
  python backend/scripts/seed_database.py --dump
======================================================================
"""

import os
import sys
import uuid
import secrets
import hashlib
import argparse
import subprocess
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from argon2 import PasswordHasher

# Resolve workspace directories
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
WORKSPACE_ROOT = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
INFRA_SQL_FILE = os.path.join(WORKSPACE_ROOT, "infra", "mysql", "seeded_db.sql")

# Load environment configs
load_dotenv(os.path.join(WORKSPACE_ROOT, ".env"))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# Database Connection URLs
AUTH_DB_URL = os.getenv("AUTH_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_auth_db")
CATALOG_DB_URL = os.getenv("EVENT_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_catalog_db")
BOOKING_DB_URL = os.getenv("BOOKING_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_booking_db")
NOTIF_DB_URL = os.getenv("NOTIFICATION_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_notification_db")

# Password Hasher
_ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=1,
    hash_len=32,
    salt_len=16
)

def hash_pw(password: str) -> str:
    return _ph.hash(password)

# Fixed Demo IDs so relationships correlate across decoupled DBs
ADMIN_USER_ID = 65587779
ORGANIZER_USER_ID = 82066610
ATTENDEE_USER_ID = 25252640


def seed_auth_service(auth_engine):
    print("\n[1/4] Seeding Auth Service DB (Users & Credentials)...")
    now = datetime.now(timezone.utc)

    # Required accounts matching README credentials
    seed_users = [
        # Administrator accounts
        {
            "id": 65587778,
            "full_name": "System Administrator",
            "email": "admin@eventpass.com",
            "password": "AdminPass@123",
            "role": "ADMIN",
            "organization_name": "EventPass Admin HQ",
            "is_email_verified": True,
            "is_active": True,
        },
        {
            "id": 65587779,
            "full_name": "System Administrator",
            "email": "admin@eventpass.io",
            "password": "AdminPass@123",
            "role": "ADMIN",
            "organization_name": "EventPass Admin HQ",
            "is_email_verified": True,
            "is_active": True,
        },
        # Organizer / Event Host accounts
        {
            "id": 82066611,
            "full_name": "Apex Event Productions",
            "email": "organizer@eventpass.com",
            "password": "OrganizerPass@123",
            "role": "ORGANIZER",
            "organization_name": "Premier Events Co.",
            "is_email_verified": True,
            "is_active": True,
        },
        {
            "id": 82066610,
            "full_name": "Apex Event Productions",
            "email": "organizer@eventpass.io",
            "password": "OrganizerPass@123",
            "role": "ORGANIZER",
            "organization_name": "Premier Events Co.",
            "is_email_verified": True,
            "is_active": True,
        },
        # Attendee / Customer accounts
        {
            "id": 25252641,
            "full_name": "Alex Rivera",
            "email": "user@eventpass.com",
            "password": "UserPass@123",
            "role": "CUSTOMER",
            "organization_name": None,
            "is_email_verified": True,
            "is_active": True,
        },
        {
            "id": 25252642,
            "full_name": "Alex Rivera",
            "email": "attendee@eventpass.com",
            "password": "UserPass@123",
            "role": "CUSTOMER",
            "organization_name": None,
            "is_email_verified": True,
            "is_active": True,
        },
        {
            "id": 25252640,
            "full_name": "Test Attendee",
            "email": "attendee.test@eventpass.io",
            "password": "UserPass@123",
            "role": "ATTENDEE",
            "organization_name": None,
            "is_email_verified": True,
            "is_active": True,
        },
    ]

    with auth_engine.connect() as conn:
        for u in seed_users:
            pwd_hash = hash_pw(u["password"])
            existing = conn.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": u["email"]}
            ).fetchone()

            if existing:
                conn.execute(
                    text("""
                        UPDATE users
                        SET password_hash = :pwd,
                            full_name = :full_name,
                            role = :role,
                            organization_name = :org,
                            is_email_verified = 1,
                            is_active = 1,
                            updated_at = :now
                        WHERE id = :uid
                    """),
                    {
                        "pwd": pwd_hash,
                        "full_name": u["full_name"],
                        "role": u["role"],
                        "org": u["organization_name"],
                        "now": now,
                        "uid": existing[0],
                    }
                )
                print(f"  * Synchronized user: {u['email']} [{u['role']}] (ID: {existing[0]})")
            else:
                target_id = u["id"]
                id_conflict = conn.execute(
                    text("SELECT id FROM users WHERE id = :id"),
                    {"id": target_id}
                ).fetchone()
                if id_conflict:
                    target_id = secrets.randbelow(89999999) + 10000000

                conn.execute(
                    text("""
                        INSERT INTO users (id, full_name, email, password_hash, role, organization_name, is_email_verified, is_active, mfa_enabled, created_at, updated_at)
                        VALUES (:id, :full_name, :email, :pwd, :role, :org, 1, 1, 0, :now, :now)
                    """),
                    {
                        "id": target_id,
                        "full_name": u["full_name"],
                        "email": u["email"],
                        "pwd": pwd_hash,
                        "role": u["role"],
                        "org": u["organization_name"],
                        "now": now,
                    }
                )
                print(f"  + Created user: {u['email']} [{u['role']}] (ID: {target_id})")
        conn.commit()


def seed_event_catalog(catalog_engine):
    print("\n[2/4] Seeding Event Catalog DB (Categories & Curated Live Events)...")
    now = datetime.now(timezone.utc)

    categories = [
        ("Music & Live Concerts", "music-concerts"),
        ("Tech & AI Conferences", "tech-conferences"),
        ("Standup Comedy & Theatre", "comedy-theatre"),
        ("Arts & Cultural Exhibitions", "arts-culture"),
        ("Sports & Fitness Marathons", "sports-fitness"),
        ("Food, Wine & Nightlife", "food-nightlife"),
        ("Workshops & Masterclasses", "workshops"),
    ]

    cat_map = {}
    with catalog_engine.connect() as conn:
        for name, slug in categories:
            row = conn.execute(
                text("SELECT id FROM event_categories WHERE slug = :slug"),
                {"slug": slug}
            ).fetchone()
            if row:
                conn.execute(
                    text("UPDATE event_categories SET name = :name WHERE id = :id"),
                    {"name": name, "id": row[0]}
                )
                cat_map[slug] = row[0]
                print(f"  = Category ready: {name} (ID: {row[0]})")
            else:
                res = conn.execute(
                    text("INSERT INTO event_categories (name, slug) VALUES (:name, :slug)"),
                    {"name": name, "slug": slug}
                )
                cat_map[slug] = res.lastrowid
                print(f"  + Created category: {name} (ID: {res.lastrowid})")
        conn.commit()

        # Curated events created by the seeded Organizer so they show up on the Organizer Dashboard
        events_to_seed = [
            {
                "title": "Global Tech & AI Summit 2026",
                "slug": "global-tech-ai-summit-2026",
                "description": "The world's premier gathering of artificial intelligence researchers, distributed systems architects, and venture leaders. Keynotes from industry pioneers and technical deep-dives into LLMs, autonomous agents, and quantum computing.",
                "category_id": cat_map["tech-conferences"],
                "venue_name": "San Francisco Civic Center",
                "venue_address": "99 Grove St, San Francisco, CA 94102",
                "start_at": now + timedelta(days=14, hours=9),
                "end_at": now + timedelta(days=16, hours=18),
                "price": Decimal("2499.00"),
                "currency": "INR",
                "total_capacity": 500,
                "available_capacity": 485,
                "status": "PUBLISHED",
                "created_by": ORGANIZER_USER_ID,
            },
            {
                "title": "A.R. Rahman Live in Concert — Mumbai",
                "slug": "ar-rahman-live-in-concert-mumbai",
                "description": "Academy Award and Grammy winner A.R. Rahman presents a breathtaking live symphony featuring iconic compositions, global vocalists, and a 65-piece live orchestra at the prestigious Jio World Arena.",
                "category_id": cat_map["music-concerts"],
                "venue_name": "Jio World Garden & Arena",
                "venue_address": "Bandra Kurla Complex (BKC), Mumbai, Maharashtra 400051",
                "start_at": now + timedelta(days=12, hours=19),
                "end_at": now + timedelta(days=12, hours=23),
                "price": Decimal("2499.00"),
                "currency": "INR",
                "total_capacity": 5000,
                "available_capacity": 4850,
                "status": "PUBLISHED",
                "created_by": ORGANIZER_USER_ID,
            },
            {
                "title": "Sunburn Arena EDM Festival ft. International DJs",
                "slug": "sunburn-arena-edm-festival-goa",
                "description": "Asia's premier electronic dance music festival returns with state-of-the-art stage pyrotechnics, immersive laser mapping, and headline sets from world top 10 DJ acts.",
                "category_id": cat_map["music-concerts"],
                "venue_name": "Vagator Festival Grounds",
                "venue_address": "Vagator Beach Road, Anjuna, Goa 403509",
                "start_at": now + timedelta(days=22, hours=16),
                "end_at": now + timedelta(days=23, hours=2),
                "price": Decimal("1999.00"),
                "currency": "INR",
                "total_capacity": 10000,
                "available_capacity": 8920,
                "status": "PUBLISHED",
                "created_by": ORGANIZER_USER_ID,
            },
            {
                "title": "Zakir Khan Live — 'Tathastu' Special Tour",
                "slug": "zakir-khan-live-comedy-tour",
                "description": "The Sakht Launda returns with an all-new 90-minute storytelling standup special. A hilarious journey through Indian family anecdotes, heartbreak, and unadulterated nostalgia.",
                "category_id": cat_map["comedy-theatre"],
                "venue_name": "Siri Fort Auditorium",
                "venue_address": "August Kranti Marg, Siri Fort Institutional Area, New Delhi 110049",
                "start_at": now + timedelta(days=8, hours=20),
                "end_at": now + timedelta(days=8, hours=22),
                "price": Decimal("999.00"),
                "currency": "INR",
                "total_capacity": 1800,
                "available_capacity": 1640,
                "status": "PUBLISHED",
                "created_by": ORGANIZER_USER_ID,
            },
            {
                "title": "Bengaluru Craft Beer & Gourmet Street Food Carnival",
                "slug": "bengaluru-craft-beer-food-carnival",
                "description": "Over 40 microbreweries, 60 artisan culinary pop-ups, live indie bands, flea markets, and brewmaster pairing sessions spread across the lush outdoor lawns.",
                "category_id": cat_map["food-nightlife"],
                "venue_name": "Jaymahal Palace Hotel Lawns",
                "venue_address": "1 Jayamahal Road, Near Cantonment Railway Station, Bengaluru 560046",
                "start_at": now + timedelta(days=16, hours=12),
                "end_at": now + timedelta(days=17, hours=23),
                "price": Decimal("799.00"),
                "currency": "INR",
                "total_capacity": 3500,
                "available_capacity": 3100,
                "status": "PUBLISHED",
                "created_by": ORGANIZER_USER_ID,
            },
            {
                "title": "Contemporary Urban Arts Biennial",
                "slug": "contemporary-urban-arts-biennial",
                "description": "A vibrant public exhibition presenting monumental outdoor sculptures, interactive audiovisual installations, and dynamic mural showcases from over 40 emerging international artists.",
                "category_id": cat_map["arts-culture"],
                "venue_name": "Downtown Culture Center",
                "venue_address": "320 S Michigan Ave, Chicago, IL 60604",
                "start_at": now + timedelta(days=28, hours=11),
                "end_at": now + timedelta(days=34, hours=20),
                "price": Decimal("499.00"),
                "currency": "INR",
                "total_capacity": 300,
                "available_capacity": 280,
                "status": "PUBLISHED",
                "created_by": ORGANIZER_USER_ID,
            },
            {
                "title": "National Marathon & Fitness Carnival 2026",
                "slug": "national-marathon-fitness-carnival",
                "description": "Join 15,000 passionate runners across 10K, Half Marathon, and Full Marathon courses with RFID chip timing, finisher medals, and recovery zones.",
                "category_id": cat_map["sports-fitness"],
                "venue_name": "Marine Drive Promenade",
                "venue_address": "Marine Drive, Nariman Point, Mumbai 400021",
                "start_at": now + timedelta(days=35, hours=5, minutes=30),
                "end_at": now + timedelta(days=35, hours=11),
                "price": Decimal("699.00"),
                "currency": "INR",
                "total_capacity": 15000,
                "available_capacity": 13500,
                "status": "PUBLISHED",
                "created_by": ORGANIZER_USER_ID,
            },
        ]

        seeded_event_ids = []
        for item in events_to_seed:
            row = conn.execute(
                text("SELECT id FROM events WHERE slug = :slug"),
                {"slug": item["slug"]}
            ).fetchone()

            if row:
                conn.execute(
                    text("""
                        UPDATE events
                        SET title = :title,
                            description = :description,
                            category_id = :category_id,
                            venue_name = :venue_name,
                            venue_address = :venue_address,
                            start_at = :start_at,
                            end_at = :end_at,
                            price = :price,
                            currency = :currency,
                            total_capacity = :total_capacity,
                            available_capacity = :available_capacity,
                            status = :status,
                            created_by = :created_by,
                            updated_at = :now
                        WHERE id = :id
                    """),
                    {**item, "id": row[0], "now": now}
                )
                seeded_event_ids.append(row[0])
                print(f"  * Synchronized event: {item['title']} (INR {item['price']} | ID: {row[0]})")
            else:
                event_id = secrets.randbelow(89999999) + 10000000
                conn.execute(
                    text("""
                        INSERT INTO events (id, title, slug, description, category_id, venue_name, venue_address, start_at, end_at, price, currency, total_capacity, available_capacity, status, created_by, created_at, updated_at)
                        VALUES (:id, :title, :slug, :description, :category_id, :venue_name, :venue_address, :start_at, :end_at, :price, :currency, :total_capacity, :available_capacity, :status, :created_by, :now, :now)
                    """),
                    {**item, "id": event_id, "now": now}
                )
                seeded_event_ids.append(event_id)
                print(f"  + Created event: {item['title']} (INR {item['price']} | ID: {event_id})")

        conn.commit()
    return seeded_event_ids


def seed_bookings_and_tickets(booking_engine, target_event_id: int):
    print("\n[3/4] Seeding Booking Service DB (Bookings, Digital QR Tickets & Check-Ins)...")
    now = datetime.now(timezone.utc)

    with booking_engine.connect() as conn:
        booking_ref = "BK-DEMO-202610-001"
        existing_bk = conn.execute(
            text("SELECT id FROM bookings WHERE booking_reference = :ref"),
            {"ref": booking_ref}
        ).fetchone()

        if existing_bk:
            bk_id = existing_bk[0]
            print(f"  = Booking exists: {booking_ref} (ID: {bk_id})")
        else:
            bk_id = secrets.randbelow(89999999) + 10000000
            conn.execute(
                text("""
                    INSERT INTO bookings (id, booking_reference, customer_id, customer_email, customer_name, event_id, quantity, unit_price_snapshot, total_amount_snapshot, currency, payment_status, status, idempotency_key, created_at, updated_at)
                    VALUES (:id, :ref, :cust_id, :cust_email, :cust_name, :evt_id, 3, 2499.00, 7497.00, 'INR', 'PAID', 'CONFIRMED', :idem, :now, :now)
                """),
                {
                    "id": bk_id,
                    "ref": booking_ref,
                    "cust_id": ATTENDEE_USER_ID,
                    "cust_email": "user@eventpass.com",
                    "cust_name": "Alex Rivera",
                    "evt_id": target_event_id,
                    "idem": "demo-seed-idempotency-key-001",
                    "now": now - timedelta(days=2),
                }
            )
            print(f"  + Created Booking: {booking_ref} (ID: {bk_id}, Event ID: {target_event_id})")

        # Status History entry
        hist_check = conn.execute(
            text("SELECT id FROM booking_status_history WHERE booking_id = :bkid"),
            {"bkid": bk_id}
        ).fetchone()
        if not hist_check:
            conn.execute(
                text("""
                    INSERT INTO booking_status_history (booking_id, previous_status, new_status, reason, changed_at)
                    VALUES (:bkid, 'PENDING', 'CONFIRMED', 'Demo Payment Verified via Razorpay', :now)
                """),
                {"bkid": bk_id, "now": now - timedelta(days=2)}
            )

        # Seed 3 Distinct Tickets:
        # Ticket 1: Already CHECKED_IN (for roster analytics)
        # Ticket 2: ACTIVE (ready for in-browser QR scanning)
        # Ticket 3: ACTIVE (ready for in-browser QR scanning)
        tickets_data = [
            {
                "ref": "TKT-DEMO-202610-001",
                "seat": "VIP Front Row A-12",
                "status": "CHECKED_IN",
                "checked_in_at": now - timedelta(hours=3),
                "checked_in_by": "organizer@eventpass.com",
                "notes": "Verified at Gate 1 via in-browser camera scanner",
            },
            {
                "ref": "TKT-DEMO-202610-002",
                "seat": "VIP Front Row A-13",
                "status": "ACTIVE",
                "checked_in_at": None,
                "checked_in_by": None,
                "notes": None,
            },
            {
                "ref": "TKT-DEMO-202610-003",
                "seat": "General Admission B-44",
                "status": "ACTIVE",
                "checked_in_at": None,
                "checked_in_by": None,
                "notes": None,
            },
        ]

        for t in tickets_data:
            existing_tkt = conn.execute(
                text("SELECT id FROM tickets WHERE ticket_reference = :ref"),
                {"ref": t["ref"]}
            ).fetchone()

            raw_token = f"tok_{secrets.token_hex(16)}"
            token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

            if existing_tkt:
                conn.execute(
                    text("""
                        UPDATE tickets
                        SET status = :status,
                            checked_in_at = :checked_in_at,
                            checked_in_by = :checked_in_by,
                            check_in_notes = :notes,
                            seat_label = :seat,
                            updated_at = :now
                        WHERE id = :id
                    """),
                    {
                        "id": existing_tkt[0],
                        "status": t["status"],
                        "checked_in_at": t["checked_in_at"],
                        "checked_in_by": t["checked_in_by"],
                        "notes": t["notes"],
                        "seat": t["seat"],
                        "now": now,
                    }
                )
                print(f"  * Synchronized Ticket: {t['ref']} [{t['status']}] (ID: {existing_tkt[0]})")
            else:
                tkt_id = secrets.randbelow(89999999) + 10000000
                conn.execute(
                    text("""
                        INSERT INTO tickets (id, booking_id, event_id, customer_id, ticket_reference, token_hash, seat_label, status, issued_at, checked_in_at, checked_in_by, check_in_notes, created_at, updated_at)
                        VALUES (:id, :bkid, :evtid, :custid, :ref, :thash, :seat, :status, :issued, :checked_in_at, :checked_in_by, :notes, :issued, :now)
                    """),
                    {
                        "id": tkt_id,
                        "bkid": bk_id,
                        "evtid": target_event_id,
                        "custid": ATTENDEE_USER_ID,
                        "ref": t["ref"],
                        "thash": token_hash,
                        "seat": t["seat"],
                        "status": t["status"],
                        "issued": now - timedelta(days=2),
                        "checked_in_at": t["checked_in_at"],
                        "checked_in_by": t["checked_in_by"],
                        "notes": t["notes"],
                        "now": now,
                    }
                )
                print(f"  + Created Ticket: {t['ref']} [{t['status']}] (ID: {tkt_id})")

        conn.commit()


def seed_notifications(notif_engine):
    print("\n[4/4] Seeding Notification DB (Dispatched Confirmation Logs)...")
    now = datetime.now(timezone.utc)

    notifs = [
        {
            "event_type": "VERIFY_EMAIL",
            "recipient": "user@eventpass.com",
            "status": "SENT",
            "attempts": 1,
            "created_at": now - timedelta(days=5),
            "sent_at": now - timedelta(days=5),
        },
        {
            "event_type": "BOOKING_CONFIRMATION",
            "recipient": "user@eventpass.com",
            "status": "SENT",
            "attempts": 1,
            "created_at": now - timedelta(days=2),
            "sent_at": now - timedelta(days=2),
        },
        {
            "event_type": "TICKET_ISSUED",
            "recipient": "user@eventpass.com",
            "status": "SENT",
            "attempts": 1,
            "created_at": now - timedelta(days=2),
            "sent_at": now - timedelta(days=2),
        },
    ]

    with notif_engine.connect() as conn:
        for n in notifs:
            existing = conn.execute(
                text("SELECT id FROM notification_records WHERE event_type = :etype AND recipient = :rcpt"),
                {"etype": n["event_type"], "rcpt": n["recipient"]}
            ).fetchone()
            if not existing:
                conn.execute(
                    text("""
                        INSERT INTO notification_records (event_type, recipient, status, attempts, created_at, sent_at)
                        VALUES (:etype, :rcpt, :status, :attempts, :created, :sent)
                    """),
                    {
                        "etype": n["event_type"],
                        "rcpt": n["recipient"],
                        "status": n["status"],
                        "attempts": n["attempts"],
                        "created": n["created_at"],
                        "sent": n["sent_at"],
                    }
                )
                print(f"  + Logged notification: {n['event_type']} -> {n['recipient']}")
        conn.commit()


def export_sql_dump():
    print("\n" + "=" * 70)
    print("DUMPING SEEDED DATABASES TO infra/mysql/seeded_db.sql...")
    print("=" * 70)
    try:
        # Check if mysqldump is available
        res = subprocess.run(["mysqldump", "--version"], capture_output=True, text=True)
        if res.returncode == 0:
            cmd = [
                "mysqldump",
                "-u", "app_user",
                "-papp_password_dev_only",
                "-h", "localhost",
                "--databases",
                "event_auth_db",
                "event_catalog_db",
                "event_booking_db",
                "event_notification_db",
                "--add-drop-database",
                "--add-drop-table",
                "--routines",
                "--events"
            ]
            with open(INFRA_SQL_FILE, "wb") as f:
                dump_res = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE)
            if dump_res.returncode == 0:
                size_kb = os.path.getsize(INFRA_SQL_FILE) / 1024
                print(f"[SUCCESS] Exported fresh database dump ({size_kb:.1f} KB) to:")
                print(f"          {INFRA_SQL_FILE}")
                return
            else:
                print(f"[WARN] mysqldump failed with: {dump_res.stderr.decode('utf-8', errors='ignore')}")
    except Exception as exc:
        print(f"[INFO] mysqldump command not available or failed: {exc}")

    print("[INFO] Skipped mysqldump export (tables already seeded live in MySQL).")


def main():
    parser = argparse.ArgumentParser(description="EventPass Database Seeder & Sync Tool")
    parser.add_argument("--dump", action="store_true", default=True, help="Export seeded MySQL databases to infra/mysql/seeded_db.sql")
    parser.add_argument("--no-dump", dest="dump", action="store_false", help="Skip export to SQL dump file")
    args = parser.parse_args()

    print("=" * 70)
    print("EVENTPASS PLATFORM — AUTOMATED SEED & SYNCHRONIZATION")
    print("=" * 70)

    try:
        auth_engine = create_engine(AUTH_DB_URL)
        catalog_engine = create_engine(CATALOG_DB_URL)
        booking_engine = create_engine(BOOKING_DB_URL)
        notif_engine = create_engine(NOTIF_DB_URL)

        seed_auth_service(auth_engine)
        event_ids = seed_event_catalog(catalog_engine)
        target_event = event_ids[0] if event_ids else 10000001
        seed_bookings_and_tickets(booking_engine, target_event)
        seed_notifications(notif_engine)

        if args.dump:
            export_sql_dump()

        print("\n" + "=" * 70)
        print("SEEDING COMPLETE! ALL CREDENTIALS READY FOR COLLABORATORS")
        print("=" * 70)
        print("Default Accounts (Matching README):")
        print("  - Admin     : admin@eventpass.com     / AdminPass@123")
        print("  - Host/Org  : organizer@eventpass.com / OrganizerPass@123")
        print("  - Attendee  : user@eventpass.com      / UserPass@123")
        print("=" * 70)

    except Exception as exc:
        print(f"\n[ERROR] Seeding failed: {exc}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
