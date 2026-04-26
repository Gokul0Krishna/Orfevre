import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()

def get_pg_connection():
    """
    Returns a psycopg2 connection with RealDictCursor so all rows
    come back as dicts — directly JSON-serialisable in FastAPI.
    """
    return psycopg2.connect(
        os.getenv("DATABASE_URL"),
        cursor_factory=RealDictCursor
    )

if not firebase_admin._apps:
    cert_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    
    if cert_path and os.path.exists(cert_path):
        # We always initialize with the certificate if found.
        # If FIRESTORE_EMULATOR_HOST is set in .env, traffic will 
        # automatically redirect to the local emulator.
        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(cred)
        
        if os.getenv("FIRESTORE_EMULATOR_HOST"):
            print(f"OK Connected to Firestore Emulator at {os.getenv('FIRESTORE_EMULATOR_HOST')}")
        else:
            print("OK Connected to Production Firestore")
    else:
        # Fallback error if no certificate is found
        raise FileNotFoundError(
            f"Firebase Service Account key not found at: {os.path.abspath(cert_path if cert_path else 'EMPTY')}. "
            "Please check your .env file."
        )

db = firestore.client()
