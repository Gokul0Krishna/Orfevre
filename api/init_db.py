import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@34.47.182.248:5432/postgres")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def init_db():
    with engine.connect() as conn:
        print("Creating tables...")
        # Gigs table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS gigs (
                id UUID PRIMARY KEY,
                merchant_uid TEXT,
                shop_id UUID,
                title TEXT,
                trade TEXT,
                description TEXT,
                district TEXT,
                area TEXT,
                budget TEXT,
                duration TEXT,
                slots INTEGER,
                tokens_reward INTEGER,
                status TEXT DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Applications table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS applications (
                id UUID PRIMARY KEY,
                gig_id UUID REFERENCES gigs(id),
                merchant_uid TEXT,
                youth_uid TEXT,
                status TEXT DEFAULT 'pending',
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            );
        """))
        
        # Inventory table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS inventory (
                id UUID PRIMARY KEY,
                vendor_id TEXT,
                product_name TEXT,
                stock FLOAT,
                avg_weekly_sales FLOAT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Edges table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS edges (
                id UUID PRIMARY KEY,
                from_user_id TEXT,
                to_user_id TEXT,
                type TEXT,
                weight FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        conn.commit()
        print("Success: Tables 'gigs' and 'applications' are ready.")

if __name__ == "__main__":
    init_db()
