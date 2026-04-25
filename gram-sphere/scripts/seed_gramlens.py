"""
seed_gramlens.py — Populates Firestore with a realistic artisan network
for the GramLens trust graph visualization.
Run: ..\.venv\Scripts\python.exe scripts/seed_gramlens.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.firestore import db
from google.cloud import firestore as fs
from datetime import datetime, timedelta
import random
import uuid

# ── Karnataka district GPS centroids ─────────────────────────────────
DISTRICT_COORDS = {
    "Mysuru":    {"lat": 12.2958, "lng": 76.6394},
    "Mandya":    {"lat": 12.5218, "lng": 76.8951},
    "Hassan":    {"lat": 13.0033, "lng": 76.1004},
    "Kodagu":    {"lat": 12.4244, "lng": 75.7382},
    "Chamarajanagar": {"lat": 11.9218, "lng": 76.9395},
    "Ramanagara":{"lat": 12.7157, "lng": 77.2809},
    "Tumkur":    {"lat": 13.3379, "lng": 77.1013},
    "Bengaluru": {"lat": 12.9716, "lng": 77.5946},
}

TRADES = ["carpenter", "weaver", "potter", "blacksmith", "tailor", "mason"]
TIERS  = ["bronze", "silver", "gold"]
TIER_WEIGHTS = {"bronze": 0.2, "silver": 0.5, "gold": 0.8}
EDGE_TYPES = ["gig", "vouch", "loan"]

NAMES = [
    "Arjun Kumar", "Meena Devi", "Raju Naik", "Priya Gowda", "Suresh Babu",
    "Kavitha Rani", "Ramesh Rao", "Sunita Kumari", "Vikram Singh", "Anitha Murthy",
    "Kiran Nair", "Deepa Shetty", "Mahesh Patil", "Rekha Desai", "Naveen Kumar",
    "Geetha Swamy", "Basavaraj", "Lakshmi Devi", "Shiva Kumar", "Usha Rani",
    "Manjunath", "Padma Devi", "Raghu Veer", "Shanthi Gowda", "Vinod Kumar",
    "Kamala Bai", "Santosh Reddy", "Bhavani", "Prakash Hegde", "Vasantha Kumari",
    "Gopal Das", "Sarala Devi", "Madan Kumar", "Nirmala", "Chandrashekhar",
    "Sumitra", "Balakrishna", "Nalini", "Dinesh Shetty", "Vimala Devi"
]

def jitter(coord, amount=0.08):
    return coord + random.uniform(-amount, amount)

def seed():
    print("Seeding GramLens data to Production Firestore...")
    batch = db.batch()

    users = []
    districts = list(DISTRICT_COORDS.keys())

    # Generate 40 artisan users
    print("  Creating 40 users...")
    for i, name in enumerate(NAMES):
        uid = f"demo_user_{i+1:03d}"
        district = random.choice(districts)
        coords = DISTRICT_COORDS[district]
        trade = TRADES[i % len(TRADES)]
        tier = random.choices(TIERS, weights=[0.6, 0.3, 0.1])[0]
        trust_score = random.randint(20, 85)
        days_ago = random.randint(0, 90)
        created = datetime.utcnow() - timedelta(days=days_ago)

        user = {
            "name": name,
            "trade": trade,
            "district": district,
            "role": "youth",
            "trustScore": trust_score,
            "skillTokens": random.randint(0, 15),
            "level": random.randint(1, 5),
            "certTier": tier,
            "certTrustWeight": TIER_WEIGHTS[tier],
            "avgGigRating": round(random.uniform(3.5, 5.0), 1),
            "lat": jitter(coords["lat"]),
            "lng": jitter(coords["lng"]),
            "createdAt": created
        }
        users.append({"uid": uid, **user})
        ref = db.collection("users").document(uid)
        batch.set(ref, user)

    batch.commit()
    print(f"  OK {len(users)} users written.")

    # Generate ~80 edges between users
    print("  Creating 80 trust edges...")
    batch2 = db.batch()
    edge_count = 0

    for i in range(80):
        src = random.choice(users)
        tgt = random.choice(users)
        if src["uid"] == tgt["uid"]:
            continue
        edge_type = random.choice(EDGE_TYPES)
        days_ago = random.randint(0, 60)
        created = datetime.utcnow() - timedelta(days=days_ago)

        edge = {
            "fromUserId": src["uid"],
            "toUserId":   tgt["uid"],
            "type":       edge_type,
            "weight":     round(random.uniform(0.5, 1.5), 2),
            "createdAt":  created
        }
        edge_ref = db.collection("edges").document()
        batch2.set(edge_ref, edge)
        edge_count += 1

    batch2.commit()
    print(f"  OK {edge_count} edges written.")

    # Update analytics/velocity with current state
    print("  Updating analytics...")
    db.collection("analytics").document("velocity").set({
        "score": edge_count,
        "delta": 42.0,
        "trend": "up",
        "thisWeek": random.randint(10, 25),
        "lastWeek": random.randint(5, 15)
    })

    print("\nDone! GramLens network is ready.")
    print(f"  Users: {len(users)}")
    print(f"  Edges: {edge_count}")
    print(f"  Districts: {len(districts)}")

if __name__ == "__main__":
    seed()
