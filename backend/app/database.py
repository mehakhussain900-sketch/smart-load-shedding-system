from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    # Ensure additive columns exist in existing SQLite database
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE demand_settings ADD COLUMN transformer_rating_va FLOAT DEFAULT 1000.0"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE demand_settings ADD COLUMN power_factor FLOAT DEFAULT 0.8"))
                conn.commit()
            except Exception:
                pass
    except Exception:
        pass

    # Seed default load configs and demand settings if tables are empty
    from .services.load_shed_service import seed_load_configs
    db = SessionLocal()
    try:
        seed_load_configs(db)
    finally:
        db.close()
