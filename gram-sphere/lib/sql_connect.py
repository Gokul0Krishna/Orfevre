import os
import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Configuration
INSTANCE_CONNECTION_NAME = os.getenv("INSTANCE_CONNECTION_NAME")  # e.g. "project:region:instance"
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_NAME", "gramsphere")
DB_URL = os.getenv("DATABASE_URL")


def _build_engine():
    """
    Build the SQLAlchemy engine.
    - If INSTANCE_CONNECTION_NAME is set → use Cloud SQL Python Connector
    - Otherwise → fall back to DATABASE_URL (direct psycopg2 connection)
    """
    if INSTANCE_CONNECTION_NAME:
        # Lazy import — only pull in Cloud SQL deps when actually needed
        from google.cloud.sql.connector import Connector, IPTypes
        from google.oauth2 import service_account
        import pg8000  # noqa: F811

        sa_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        credentials = None
        if sa_path and os.path.exists(sa_path):
            credentials = service_account.Credentials.from_service_account_file(sa_path)

        connector = Connector(credentials=credentials)

        def _get_conn():
            return connector.connect(
                INSTANCE_CONNECTION_NAME,
                "pg8000",
                user=DB_USER,
                password=DB_PASS,
                db=DB_NAME,
                ip_type=IPTypes.PUBLIC,
            )

        return create_engine("postgresql+pg8000://", creator=_get_conn)

    # Direct connection via DATABASE_URL (local Postgres, Supabase, Neon, etc.)
    if not DB_URL:
        raise ValueError(
            "Neither INSTANCE_CONNECTION_NAME nor DATABASE_URL is set in .env. "
            "Please configure one of them."
        )
    return create_engine(DB_URL, pool_pre_ping=True)


engine = _build_engine()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_sql_session():
    """FastAPI dependency — yields a DB session and closes it afterwards."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def execute_query(query, params=None):
    """Utility to run a raw SQL query and return rows as dicts."""
    with engine.connect() as connection:
        result = connection.execute(sqlalchemy.text(query), params or {})
        if result.returns_rows:
            return [dict(row._mapping) for row in result]
        return None
