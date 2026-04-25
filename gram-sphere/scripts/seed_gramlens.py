"""
seed_gramlens.py — Populates Firestore with a realistic artisan network
for the GramLens trust graph visualization.
Now with Merchant/Worker roles and location privacy.
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
EDGE_TYPES = ["gig", "vouch", "employment"]

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
    print("Seeding Optimized GramLens Network to Production Firestore...")
    
    # Clear existing
    print("  Clearing existing network data...")
    for doc in db.collection("users").stream(): doc.reference.delete()
    for doc in db.collection("edges").stream(): doc.reference.delete()

    batch = db.batch()
    users = []
    districts = list(DISTRICT_COORDS.keys())

    # 1. Create 60 users for a richer graph
    print("  Generating 60 specialized nodes (Clustered by Trade)...")
    # Define trade specializations for districts to create "hubs"
    district_specialty = {
        "Mysuru":    ["weaver", "carpenter"],
        "Mandya":    ["potter", "weaver"],
        "Hassan":    ["blacksmith", "mason"],
        "Kodagu":    ["carpenter", "tailor"],
        "Chamarajanagar": ["weaver", "potter"],
        "Ramanagara":["tailor", "blacksmith"],
        "Tumkur":    ["mason", "carpenter"],
        "Bengaluru": ["tailor", "blacksmith"]
    }

    for i in range(60):
        uid = f"demo_user_{i+1:03d}"
        name = NAMES[i % len(NAMES)] if i < len(NAMES) else f"Artisan {i}"
        district = districts[i % len(districts)]
        
        # Select trade based on district specialty
        trade = random.choice(district_specialty[district])
        
        role = "merchant" if i % 6 == 0 else "worker"
        tier = random.choices(TIERS, weights=[0.4, 0.4, 0.2])[0]
        
        user = {
            "name": name,
            "trade": trade,
            "district": district,
            "role": role,
            "trustScore": random.randint(40, 95) if tier in ("gold", "silver") else random.randint(20, 60),
            "skillTokens": random.randint(5, 20) if role == "merchant" else random.randint(0, 10),
            "certTier": tier,
            "certTrustWeight": TIER_WEIGHTS[tier],
            "createdAt": datetime.utcnow() - timedelta(days=random.randint(10, 120))
        }
        
        if role == "merchant":
            user["lat"] = jitter(DISTRICT_COORDS[district]["lat"], 0.04)
            user["lng"] = jitter(DISTRICT_COORDS[district]["lng"], 0.04)
        
        users.append({"uid": uid, **user})
        ref = db.collection("users").document(uid)
        batch.set(ref, user)

    batch.commit()
    print(f"  OK {len(users)} users written.")

    # 2. Generate Structured Edges
    print("  Building specialized trade hubs...")
    batch2 = db.batch()
    edge_count = 0

    merchants = [u for u in users if u["role"] == "merchant"]
    workers   = [u for u in users if u["role"] == "worker"]

    # Rule A: Employment Hubs
    for w in workers:
        local_merchants = [m for m in merchants if m["district"] == w["district"]]
        if local_merchants:
            # High chance to connect to a local merchant
            if random.random() < 0.9:
                m = random.choice(local_merchants)
                edge = {
                    "fromUserId": w["uid"],
                    "toUserId":   m["uid"],
                    "type":       "employment",
                    "weight":     1.5,
                    "createdAt":  datetime.utcnow() - timedelta(days=random.randint(1, 30))
                }
                batch2.set(db.collection("edges").document(), edge)
                edge_count += 1

    # Rule B: Trade Peer Vouching (Much higher density within local specialties)
    for d in districts:
        district_workers = [w for w in workers if w["district"] == d]
        for i, w1 in enumerate(district_workers):
            for w2 in district_workers[i+1:]:
                if w1["trade"] == w2["trade"]:
                    # 60% chance for trade peers in the same district to vouch
                    if random.random() < 0.6:
                        edge = {
                            "fromUserId": w1["uid"],
                            "toUserId":   w2["uid"],
                            "type":       "vouch",
                            "weight":     1.0,
                            "createdAt":  datetime.utcnow() - timedelta(days=random.randint(5, 50))
                        }
                        batch2.set(db.collection("edges").document(), edge)
                        edge_count += 1

    # Rule C: Cross-District Gigs
    for _ in range(30):
        w = random.choice(workers)
        m = random.choice(merchants)
        if w["district"] != m["district"]:
            edge = {
                "fromUserId": w["uid"],
                "toUserId":   m["uid"],
                "type":       "gig",
                "weight":     0.7,
                "createdAt":  datetime.utcnow() - timedelta(days=random.randint(0, 10))
            }
            batch2.set(db.collection("edges").document(), edge)
            edge_count += 1

    batch2.commit()
    print(f"  OK {edge_count} edges written.")


    # Update analytics
    db.collection("analytics").document("velocity").set({
        "score": edge_count,
        "delta": 22.5,
        "trend": "up",
        "thisWeek": random.randint(15, 30),
        "lastWeek": random.randint(10, 20)
    })

    print("\nDone! Optimized network is live.")


if __name__ == "__main__":
    seed()

