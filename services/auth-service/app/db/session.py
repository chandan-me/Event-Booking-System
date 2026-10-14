import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Fallback default for development
DATABASE_URL = os.getenv(
    "AUTH_DATABASE_URL",
    "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_auth_db"
)

# Engine with connection pooling and pre-ping to recover from stale connections
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency to yield an isolated database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
