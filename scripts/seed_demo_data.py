import os
import sys
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup service imports
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
AUTH_SERVICE_DIR = os.path.join(ROOT_DIR, "services", "auth-service")
EVENT_SERVICE_DIR = os.path.join(ROOT_DIR, "services", "event-service")

sys.path.insert(0, AUTH_SERVICE_DIR)
from app.models import User, EmailOTP, RefreshToken
from app.security.password import hash_password

# Cleanly purge app module cache so event-service app can be imported
for mod in list(sys.modules.keys()):
    if mod == 'app' or mod.startswith('app.'):
        del sys.modules[mod]

sys.path.remove(AUTH_SERVICE_DIR)
sys.path.insert(0, EVENT_SERVICE_DIR)
from app.models.category import EventCategory
from app.models.event import Event

AUTH_DB_URL = os.getenv("AUTH_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_auth_db")
CATALOG_DB_URL = os.getenv("EVENT_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_catalog_db")

def seed():
    print("=" * 60)
    print("SEEDING DEMO DATA FOR EVENT BOOKING SYSTEM")
    print("=" * 60)

    # 1. Seed Users
    print("\n[1/3] Connecting to event_auth_db...")
    auth_engine = create_engine(AUTH_DB_URL)
    AuthSession = sessionmaker(bind=auth_engine)
    auth_db = AuthSession()

    admin_email = "admin@eventbooking.com"
    customer_email = "alice@example.com"

    admin_user = auth_db.query(User).filter(User.email == admin_email).first()
    if not admin_user:
        admin_user = User(
            full_name="System Administrator",
            email=admin_email,
            password_hash=hash_password("AdminSecret123!"),
            role="ADMIN",
            is_email_verified=True,
            is_active=True,
        )
        auth_db.add(admin_user)
        auth_db.commit()
        auth_db.refresh(admin_user)
        print(f"  + Created Admin user: {admin_email} (ID: {admin_user.id})")
    else:
        print(f"  = Admin user already exists: {admin_email}")

    admin_user_id = int(admin_user.id)

    cust_user = auth_db.query(User).filter(User.email == customer_email).first()
    if not cust_user:
        cust_user = User(
            full_name="Alice Customer",
            email=customer_email,
            password_hash=hash_password("SecurePassword123!"),
            role="CUSTOMER",
            is_email_verified=True,
            is_active=True,
        )
        auth_db.add(cust_user)
        auth_db.commit()
        auth_db.refresh(cust_user)
        print(f"  + Created Customer user: {customer_email} (ID: {cust_user.id})")
    else:
        print(f"  = Customer user already exists: {customer_email}")

    auth_db.close()

    # 2. Seed Categories
    print("\n[2/3] Connecting to event_catalog_db...")
    catalog_engine = create_engine(CATALOG_DB_URL)
    CatalogSession = sessionmaker(bind=catalog_engine)
    cat_db = CatalogSession()

    default_categories = [
        ("Technology", "technology"),
        ("Music & Concerts", "music-concerts"),
        ("Sports & Esports", "sports-esports"),
        ("Arts & Culture", "arts-culture"),
    ]

    category_map = {}
    for name, slug in default_categories:
        cat = cat_db.query(EventCategory).filter(EventCategory.slug == slug).first()
        if not cat:
            cat = EventCategory(name=name, slug=slug)
            cat_db.add(cat)
            cat_db.commit()
            cat_db.refresh(cat)
            print(f"  + Created Category: {name} (ID: {cat.id})")
        else:
            print(f"  = Category exists: {name}")
        category_map[slug] = cat.id

    # 3. Seed Live Events
    print("\n[3/3] Seeding Live Events in event_catalog_db...")
    now = datetime.now(timezone.utc)

    sample_events = [
        {
            "title": "Global Tech & AI Summit 2026",
            "slug": "global-tech-ai-summit-2026",
            "description": "The world's premier gathering of artificial intelligence researchers, distributed systems architects, and venture leaders. Keynotes from industry pioneers and technical deep-dives into LLMs, autonomous agents, and quantum computing.",
            "category_id": category_map["technology"],
            "venue_name": "San Francisco Civic Center",
            "venue_address": "99 Grove St, San Francisco, CA 94102",
            "start_at": now + timedelta(days=14, hours=9),
            "end_at": now + timedelta(days=16, hours=18),
            "price": Decimal("2499.00"),
            "currency": "INR",
            "total_capacity": 250,
            "available_capacity": 250,
            "status": "PUBLISHED",
            "created_by": admin_user_id,
        },
        {
            "title": "Electric Symphony Live: Neo-Classical Concert",
            "slug": "electric-symphony-live",
            "description": "An immersive orchestral experience combining a 60-piece philharmonic orchestra with modular synthesizers and responsive laser mapping. Feat. compositions from world-renowned cinematic soundtrack artists.",
            "category_id": category_map["music-concerts"],
            "venue_name": "Grand Arena Hall",
            "venue_address": "700 Arena Way, Austin, TX 78701",
            "start_at": now + timedelta(days=21, hours=19, minutes=30),
            "end_at": now + timedelta(days=21, hours=23),
            "price": Decimal("1299.00"),
            "currency": "INR",
            "total_capacity": 500,
            "available_capacity": 500,
            "status": "PUBLISHED",
            "created_by": admin_user_id,
        },
        {
            "title": "World Esports Championship Finals",
            "slug": "world-esports-championship-finals",
            "description": "Witness the world's elite esports contenders clash for the multimillion-dollar grand championship prize in front of 15,000 roaring fans with live caster analysis and high-stakes tournament brackets.",
            "category_id": category_map["sports-esports"],
            "venue_name": "Olympic Indoor Stadium",
            "venue_address": "1000 Champions Boulevard, Los Angeles, CA 90015",
            "start_at": now + timedelta(days=30, hours=16),
            "end_at": now + timedelta(days=31, hours=22),
            "price": Decimal("899.00"),
            "currency": "INR",
            "total_capacity": 800,
            "available_capacity": 800,
            "status": "PUBLISHED",
            "created_by": admin_user_id,
        },
        {
            "title": "Modern Minimalist Design & UX Conference",
            "slug": "modern-minimalist-design-ux-conference",
            "description": "Explore the bleeding edge of design systems, accessibility tokens, and interactive micro-animations. Hands-on workshops led by design directors from leading design studios.",
            "category_id": category_map["technology"],
            "venue_name": "Metro Exhibition Pavilion",
            "venue_address": "450 5th Avenue, New York, NY 10018",
            "start_at": now + timedelta(days=40, hours=10),
            "end_at": now + timedelta(days=41, hours=17),
            "price": Decimal("1499.00"),
            "currency": "INR",
            "total_capacity": 150,
            "available_capacity": 150,
            "status": "PUBLISHED",
            "created_by": admin_user_id,
        },
        {
            "title": "Sunset Rooftop Jazz & Wine Festival",
            "slug": "sunset-rooftop-jazz-wine-festival",
            "description": "Enjoy a curated selection of artisan vintages paired with smooth live acoustic jazz ensembles overlooking the panoramic city skyline at twilight.",
            "category_id": category_map["music-concerts"],
            "venue_name": "Skyline Terrace Gardens",
            "venue_address": "200 Harbor Drive, San Diego, CA 92101",
            "start_at": now + timedelta(days=7, hours=18),
            "end_at": now + timedelta(days=7, hours=22, minutes=30),
            "price": Decimal("1899.00"),
            "currency": "INR",
            "total_capacity": 100,
            "available_capacity": 100,
            "status": "PUBLISHED",
            "created_by": admin_user_id,
        },
        {
            "title": "Contemporary Urban Arts Biennial",
            "slug": "contemporary-urban-arts-biennial",
            "description": "A vibrant public exhibition presenting monumental outdoor sculptures, interactive audiovisual installations, and dynamic mural showcases from over 40 emerging international artists.",
            "category_id": category_map["arts-culture"],
            "venue_name": "Downtown Culture Center",
            "venue_address": "320 S Michigan Ave, Chicago, IL 60604",
            "start_at": now + timedelta(days=12, hours=11),
            "end_at": now + timedelta(days=18, hours=20),
            "price": Decimal("499.00"),
            "currency": "INR",
            "total_capacity": 300,
            "available_capacity": 300,
            "status": "PUBLISHED",
            "created_by": admin_user_id,
        },
    ]

    for item in sample_events:
        evt = cat_db.query(Event).filter(Event.slug == item["slug"]).first()
        if not evt:
            evt = Event(**item)
            cat_db.add(evt)
            cat_db.commit()
            cat_db.refresh(evt)
            print(f"  + Seeded Event: {evt.title} (Cap: {evt.available_capacity}/{evt.total_capacity}, Price: INR {evt.price} {evt.currency})")
        else:
            evt.price = item["price"]
            evt.currency = "INR"
            evt.available_capacity = item["available_capacity"]
            cat_db.commit()
            print(f"  * Updated Event to INR: {evt.title} (Price: INR {evt.price})")

    cat_db.close()
    print("\nSeeding complete! Demo data is ready in MySQL.")
    print("=" * 60)

if __name__ == "__main__":
    seed()
