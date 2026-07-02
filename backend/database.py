"""
SQLite database setup via SQLAlchemy.
Table: diagnoses — stores every geotagged diagnosis (the engine behind Outbreak Radar).
"""
import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "functionalagro.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id         = Column(Integer, primary_key=True, index=True)
    pincode    = Column(String, nullable=False, index=True)
    crop       = Column(String, nullable=False, index=True)
    disease    = Column(String, nullable=False, index=True)
    confidence = Column(Float,  nullable=False)
    timestamp  = Column(DateTime, default=datetime.utcnow, nullable=False)


def init_db():
    """Create tables if they don't exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
