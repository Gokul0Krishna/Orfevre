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

from fastapi import HTTPException

class FirestoreProxy:
    def __init__(self, client_factory):
        self._client_factory = client_factory
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = self._client_factory()
        if self._client is None:
            raise HTTPException(
                status_code=503, 
                detail="Firestore is disabled. Check FIREBASE_SERVICE_ACCOUNT_PATH."
            )
        return self._client

    def collection(self, *args, **kwargs):
        return self.client.collection(*args, **kwargs)

    def document(self, *args, **kwargs):
        return self.client.document(*args, **kwargs)

# Factory to get client or None
def get_firestore_client():
    if not firebase_admin._apps:
        cert_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        if cert_path and os.path.exists(cert_path):
            cred = credentials.Certificate(cert_path)
            firebase_admin.initialize_app(cred)
            if os.getenv("FIRESTORE_EMULATOR_HOST"):
                print(f"OK Connected to Firestore Emulator at {os.getenv('FIRESTORE_EMULATOR_HOST')}")
            else:
                print("OK Connected to Production Firestore")
            return firestore.client()
        else:
            print(f"WARNING: Firebase Service Account key not found. Firestore features will be disabled.")
            return None
    return firestore.client()

db = FirestoreProxy(get_firestore_client)
