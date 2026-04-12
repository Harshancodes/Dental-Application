import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:admin@db:5432/patients")

# Render gives postgres:// but SQLAlchemy requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db():
    """
    Dependency that provides a DB session and ensures it's closed after each request.
    Use this with FastAPI's Depends() — never open SessionLocal() manually in routes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
