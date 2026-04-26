import sys
import os
import random
from datetime import datetime, timedelta

# Add the project root to path
# Script is now in gram-sphere/test/
# PROJECT_ROOT should be the root Orfevre folder
SCRIPT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
GRAM_SPHERE_DIR = os.path.join(PROJECT_ROOT, 'gram-sphere')

sys.path.append(GRAM_SPHERE_DIR)

# Ensure we are in the gram-sphere directory so lib/firestore.py finds .env correctly
os.chdir(GRAM_SPHERE_DIR)

from lib.firestore import db

TRADES = ["Weaver", "Potter", "Cobbler", "Blacksmith", "Carpenter", "Farmer"]
DISTRICTS = ["Mysuru", "Dharwad", "Belagavi", "Mandya", "Hassan", "Tumakuru"]

def clear_collection(collection_name):
    """Deletes all documents in a collection (useful for emulator)."""
    docs = db.collection(collection_name).stream()
    deleted = 0
    for doc in docs:
        doc.reference.delete()
        deleted += 1
    if deleted > 0:
        print(f"  - Cleared {deleted} docs from {collection_name}")

def seed_data():
    print("Starting Database Seeding...")

    # Optional: Clear existing data for a fresh start
    # Note: Only do this on emulator!
    if os.getenv("FIRESTORE_EMULATOR_HOST"):
        print("Emulator detected, clearing old data first...")
        for col in ["users", "edges", "gigs", "loans", "inventory", "analytics"]:
            clear_collection(col)

    # 1. Create Users
    user_ids = []
    print("Creating users...")
    for i in range(1, 11):
        uid = f"user_{i:03}"
        role = "youth" if i <= 6 else "vendor"
        user_data = {
            "id": uid,
            "name": f"Artisan {i}",
            "trade": random.choice(TRADES),
            "district": random.choice(DISTRICTS),
            "role": role,
            "trustScore": random.randint(25, 75),
            "skillTokens": random.randint(0, 10),
            "createdAt": datetime.utcnow() - timedelta(days=random.randint(10, 50))
        }
        db.collection("users").document(uid).set(user_data)
        user_ids.append(uid)
    
    # 2. Create Gigs
    print("Creating gigs...")
    gigs = []
    for i in range(1, 6):
        gid = f"gig_{i:03}"
        vendor_id = random.choice([u for u in user_ids if u.startswith("user_007") or u.startswith("user_008")])
        gig_data = {
            "id": gid,
            "title": f"Project {random.choice(TRADES)} Assistance",
            "vendorId": vendor_id,
            "status": "open",
            "tokensReward": random.randint(1, 3),
            "createdAt": datetime.utcnow() - timedelta(days=random.randint(1, 5))
        }
        db.collection("gigs").document(gid).set(gig_data)
        gigs.append(gid)

    # 3. Create Edges (Relationships)
    print("Creating graph edges...")
    edge_types = ["vouch", "gig", "transaction", "loan"]
    for i in range(25):
        from_u = random.choice(user_ids)
        to_u = random.choice([u for u in user_ids if u != from_u])
        db.collection("edges").add({
            "fromUserId": from_u,
            "toUserId": to_u,
            "type": random.choice(edge_types),
            "weight": round(random.uniform(0.5, 1.0), 2),
            "createdAt": datetime.utcnow() - timedelta(days=random.randint(0, 14))
        })

    # 4. Create Initial Analytics
    print("Setting up analytics...")
    db.collection("analytics").document("commonsFund").set({
        "balance": 1500.50,
        "lastUpdate": datetime.utcnow()
    })

    print("Seeding complete!")

if __name__ == "__main__":
    seed_data()
