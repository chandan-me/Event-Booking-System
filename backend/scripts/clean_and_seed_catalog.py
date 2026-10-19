import os
import sys
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if not os.path.isdir(os.path.join(ROOT_DIR, "services")) and os.path.isdir(os.path.join(ROOT_DIR, "backend", "services")):
    ROOT_DIR = os.path.join(ROOT_DIR, "backend")
EVENT_SERVICE_DIR = os.path.join(ROOT_DIR, "services", "event-service")
sys.path.insert(0, EVENT_SERVICE_DIR)

from app.models.category import EventCategory
from app.models.event import Event, generate_random_id

CATALOG_DB_URL = os.getenv(
    "EVENT_DATABASE_URL",
    "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_catalog_db"
)

def clean_and_seed():
    print("=" * 70)
    print("PROFESSIONAL CATALOG RESET & ENTERPRISE SEED")
    print("=" * 70)

    engine = create_engine(CATALOG_DB_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    # 1. Purge test events & polluted test categories
    print("\n[1/3] Purging test generated entries...")
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM events WHERE title LIKE '%One Ticket Only Show%' OR title LIKE '%Exclusive Coding Workshop%' OR title LIKE '%City Marathon 2026%' OR slug LIKE '%test%' OR slug LIKE '%179%' OR title REGEXP '[0-9]{4,}';"))
        conn.execute(text("DELETE FROM event_categories WHERE name REGEXP '[0-9]{3,}' OR slug REGEXP '[0-9]{3,}' OR name LIKE '%Last Ticket%' OR name LIKE '%Festival 1%' OR name LIKE '%Sports 1%' OR name LIKE '%Workshop 1%' OR name LIKE '%Category 1%' OR slug LIKE '%179%';"))
        conn.commit()

    # 2. Setup Curated Professional Categories
    print("\n[2/3] Setting up Professional Event Categories...")
    professional_categories = [
        ("Music & Live Concerts", "music-concerts"),
        ("Tech & AI Conferences", "tech-conferences"),
        ("Standup Comedy & Theatre", "comedy-theatre"),
        ("Arts & Cultural Exhibitions", "arts-culture"),
        ("Sports & Fitness Marathons", "sports-fitness"),
        ("Food, Wine & Nightlife", "food-nightlife"),
        ("Workshops & Masterclasses", "workshops"),
    ]

    cat_map = {}
    for name, slug in professional_categories:
        cat = session.query(EventCategory).filter(EventCategory.slug == slug).first()
        if not cat:
            cat = EventCategory(name=name, slug=slug)
            session.add(cat)
            session.commit()
            session.refresh(cat)
            print(f"  + Added Category: {name} (ID: {cat.id})")
        else:
            cat.name = name
            session.commit()
            print(f"  * Updated Category: {name} (ID: {cat.id})")
        cat_map[slug] = cat.id

    # 3. Seed Premier Live Events
    print("\n[3/3] Seeding Curated Live Events with INR Pricing...")
    now = datetime.now(timezone.utc)

    curated_events = [
        # --- Music & Concerts ---
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
            "created_by": 1,
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
            "created_by": 1,
        },
        {
            "title": "Electric Symphony: Classical Meets Modular Synth",
            "slug": "electric-symphony-live-classical",
            "description": "An intimate sonic voyage combining 40 string soloists with analog synthesizers, performing neo-classical soundtrack arrangements and atmospheric electronica.",
            "category_id": cat_map["music-concerts"],
            "venue_name": "Tata Theatre, NCPA",
            "venue_address": "NCPA Marg, Nariman Point, Mumbai 400021",
            "start_at": now + timedelta(days=18, hours=20),
            "end_at": now + timedelta(days=18, hours=22, minutes=30),
            "price": Decimal("1299.00"),
            "currency": "INR",
            "total_capacity": 800,
            "available_capacity": 710,
            "status": "PUBLISHED",
            "created_by": 1,
        },

        # --- Tech Conferences ---
        {
            "title": "Global Tech & AI Summit 2026 — Bengaluru",
            "slug": "global-tech-ai-summit-2026-bengaluru",
            "description": "India's largest convergence of AI researchers, enterprise software architects, and venture pioneers. Dive deep into Foundation Models, Agentic AI, Autonomous Systems, and Silicon Accelerators.",
            "category_id": cat_map["tech-conferences"],
            "venue_name": "BIEC International Exhibition Centre",
            "venue_address": "10th Mile, Tumkur Road, Bengaluru, Karnataka 562123",
            "start_at": now + timedelta(days=15, hours=9),
            "end_at": now + timedelta(days=17, hours=18),
            "price": Decimal("3499.00"),
            "currency": "INR",
            "total_capacity": 3500,
            "available_capacity": 3120,
            "status": "PUBLISHED",
            "created_by": 1,
        },
        {
            "title": "AWS Cloud Community Day India",
            "slug": "aws-cloud-community-day-india-2026",
            "description": "A community-led engineering day celebrating cloud computing, serverless architectures, Kubernetes scalability, and DevOps automation with interactive hands-on lab zones.",
            "category_id": cat_map["tech-conferences"],
            "venue_name": "Manpho Convention Centre",
            "venue_address": "No. 91/4, Veerannapalya, Nagavara, Bengaluru 560045",
            "start_at": now + timedelta(days=28, hours=9, minutes=30),
            "end_at": now + timedelta(days=28, hours=18),
            "price": Decimal("899.00"),
            "currency": "INR",
            "total_capacity": 1500,
            "available_capacity": 1340,
            "status": "PUBLISHED",
            "created_by": 1,
        },

        # --- Standup Comedy & Theatre ---
        {
            "title": "Zakir Khan Live — 'Tathastu' Arena Tour",
            "slug": "zakir-khan-live-arena-tour-2026",
            "description": "The pioneer of Indian standup comedy takes the arena stage for an unmissable evening of heartwarming storytelling, witty observations on youth, family, and relationships.",
            "category_id": cat_map["comedy-theatre"],
            "venue_name": "Indira Gandhi Indoor Arena",
            "venue_address": "Yamuna Velodrome, IP Estate, New Delhi 110002",
            "start_at": now + timedelta(days=8, hours=19, minutes=30),
            "end_at": now + timedelta(days=8, hours=22),
            "price": Decimal("1299.00"),
            "currency": "INR",
            "total_capacity": 4000,
            "available_capacity": 3650,
            "status": "PUBLISHED",
            "created_by": 1,
        },
        {
            "title": "Mughal-e-Azam: The Grand Broadway Musical",
            "slug": "mughal-e-azam-grand-musical-mumbai",
            "description": "Feroz Abbas Khan's theatrical magnum opus. Over 350 Manish Malhotra-designed costumes, live Kathak dances by world masters, and an immortal cinematic soundtrack performed live.",
            "category_id": cat_map["comedy-theatre"],
            "venue_name": "NMACC Grand Theatre",
            "venue_address": "Jio World Centre, G Block, BKC, Mumbai 400051",
            "start_at": now + timedelta(days=19, hours=18),
            "end_at": now + timedelta(days=19, hours=21, minutes=30),
            "price": Decimal("2199.00"),
            "currency": "INR",
            "total_capacity": 1200,
            "available_capacity": 980,
            "status": "PUBLISHED",
            "created_by": 1,
        },

        # --- Arts & Culture ---
        {
            "title": "National Heritage Art & Sculpture Biennial",
            "slug": "national-heritage-art-sculpture-biennial",
            "description": "An awe-inspiring curated retrospective of modern Indian fine art, terracotta installations, contemporary canvas murals, and interactive light chambers from 120+ master artists.",
            "category_id": cat_map["arts-culture"],
            "venue_name": "National Gallery of Modern Art (NGMA)",
            "venue_address": "Jaipur House, India Gate, New Delhi 110003",
            "start_at": now + timedelta(days=9, hours=10),
            "end_at": now + timedelta(days=16, hours=20),
            "price": Decimal("499.00"),
            "currency": "INR",
            "total_capacity": 2500,
            "available_capacity": 2380,
            "status": "PUBLISHED",
            "created_by": 1,
        },
        {
            "title": "Contemporary Urban Arts & Mural Pavilion",
            "slug": "contemporary-urban-arts-mural-pavilion",
            "description": "Showcasing monumental open-air installations, graffiti typography, kinetic sculptures, and interactive augmented reality galleries in the heart of Mumbai.",
            "category_id": cat_map["arts-culture"],
            "venue_name": "Kala Ghoda Art Precinct",
            "venue_address": "MG Road, Fort, Mumbai 400001",
            "start_at": now + timedelta(days=25, hours=11),
            "end_at": now + timedelta(days=27, hours=21),
            "price": Decimal("699.00"),
            "currency": "INR",
            "total_capacity": 1800,
            "available_capacity": 1690,
            "status": "PUBLISHED",
            "created_by": 1,
        },

        # --- Sports & Fitness ---
        {
            "title": "Delhi Half Marathon & Fitness Carnival 2026",
            "slug": "delhi-half-marathon-fitness-carnival-2026",
            "description": "The capital's biggest marathon festival. 21K, 10K, and 5K fun runs along India Gate, complete with timing chips, race jerseys, finisher medals, and a post-race music festival.",
            "category_id": cat_map["sports-fitness"],
            "venue_name": "Jawaharlal Nehru Stadium",
            "venue_address": "Pragati Vihar, New Delhi 110003",
            "start_at": now + timedelta(days=20, hours=5, minutes=30),
            "end_at": now + timedelta(days=20, hours=12),
            "price": Decimal("750.00"),
            "currency": "INR",
            "total_capacity": 8000,
            "available_capacity": 7240,
            "status": "PUBLISHED",
            "created_by": 1,
        },
        {
            "title": "World Esports Masters: Valorant & CS2 Arena",
            "slug": "world-esports-masters-valorant-cs2",
            "description": "Elite international pro esports teams battle in an electrified stadium with 4K arena screens, live casters, fan merchandise zones, and an exhibition match showcase.",
            "category_id": cat_map["sports-fitness"],
            "venue_name": "NSCI Dome",
            "venue_address": "Lala Lajpatrai Marg, Worli, Mumbai 400018",
            "start_at": now + timedelta(days=32, hours=14),
            "end_at": now + timedelta(days=33, hours=22),
            "price": Decimal("899.00"),
            "currency": "INR",
            "total_capacity": 5000,
            "available_capacity": 4430,
            "status": "PUBLISHED",
            "created_by": 1,
        },

        # --- Food & Nightlife ---
        {
            "title": "Sunset Rooftop Jazz, Wine & Tapas Festival — Goa",
            "slug": "sunset-rooftop-jazz-wine-tapas-goa",
            "description": "A luxury coastal culinary experience paired with world vintages, artisanal cheeses, and live acoustic saxophone quartets overlooking the Arabian Sea sunset.",
            "category_id": cat_map["food-nightlife"],
            "venue_name": "Thalassa Cliffs & Lounge",
            "venue_address": "Siolim-Chopdem Road, Goa 403517",
            "start_at": now + timedelta(days=6, hours=17, minutes=30),
            "end_at": now + timedelta(days=6, hours=23),
            "price": Decimal("1899.00"),
            "currency": "INR",
            "total_capacity": 350,
            "available_capacity": 290,
            "status": "PUBLISHED",
            "created_by": 1,
        },
        {
            "title": "Great Indian Food & Craft Beer Fiesta — Pune",
            "slug": "great-indian-food-craft-beer-fiesta-pune",
            "description": "Over 80 gourmet food popups, regional barbecues, award-winning microbreweries, masterchef live cook-offs, and live indie-rock band sets.",
            "category_id": cat_map["food-nightlife"],
            "venue_name": "Mahalaxmi Lawns",
            "venue_address": "Karve Nagar, Pune, Maharashtra 411052",
            "start_at": now + timedelta(days=14, hours=13),
            "end_at": now + timedelta(days=15, hours=23),
            "price": Decimal("599.00"),
            "currency": "INR",
            "total_capacity": 3000,
            "available_capacity": 2750,
            "status": "PUBLISHED",
            "created_by": 1,
        },

        # --- Workshops & Masterclasses ---
        {
            "title": "Minimalist UI/UX Systems & Micro-Interactions Masterclass",
            "slug": "minimalist-ui-ux-design-systems-masterclass",
            "description": "An intensive hands-on masterclass with leading product design directors. Learn how to build sleek design tokens, typography scales, glassmorphism, and micro-interactions.",
            "category_id": cat_map["workshops"],
            "venue_name": "WeWork Galaxy Executive Suites",
            "venue_address": "43 Residency Road, Bengaluru 560025",
            "start_at": now + timedelta(days=10, hours=10),
            "end_at": now + timedelta(days=10, hours=17),
            "price": Decimal("1499.00"),
            "currency": "INR",
            "total_capacity": 120,
            "available_capacity": 95,
            "status": "PUBLISHED",
            "created_by": 1,
        },
    ]

    for item in curated_events:
        evt = session.query(Event).filter(Event.slug == item["slug"]).first()
        if not evt:
            evt = Event(**item)
            session.add(evt)
            session.commit()
            session.refresh(evt)
            print(f"  + Seeded: {evt.title} | Price: INR {evt.price} | Cap: {evt.available_capacity}/{evt.total_capacity}")
        else:
            evt.title = item["title"]
            evt.description = item["description"]
            evt.venue_name = item["venue_name"]
            evt.venue_address = item["venue_address"]
            evt.category_id = item["category_id"]
            evt.price = item["price"]
            evt.currency = "INR"
            evt.available_capacity = item["available_capacity"]
            evt.total_capacity = item["total_capacity"]
            evt.status = "PUBLISHED"
            session.commit()
            print(f"  * Refreshed: {evt.title} | Price: INR {evt.price}")

    session.close()
    print("\n[DONE] Enterprise catalog successfully seeded with professional categories and events!")
    print("=" * 70)

if __name__ == "__main__":
    clean_and_seed()
