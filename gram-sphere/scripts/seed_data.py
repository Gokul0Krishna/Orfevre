import sys
sys.path.append("..")
from lib.firestore import db
from datetime import datetime, timedelta
import random

TRADES = ["weaver", "potter", "cobbler", "farmer", "artisan"]
DISTRICTS = ["Mysuru", "Dharwad", "Belagavi", "Mandya", "Hassan"]

def seed():
    # Seed 15 users
    user_ids = []
    for i in range(15):
        uid = f"user_{i+1:03}"
        user_ids.append(uid)
        db.collection("users").document(uid).set({
            "name": f"User {i+1}",
            "trade": random.choice(TRADES),
            "district": random.choice(DISTRICTS),
            "role": "youth" if i < 8 else "vendor",
            "trustScore": random.randint(20, 80),
            "skillTokens": random.randint(0, 5),
            "level": 1,
            "createdAt": datetime.utcnow()
        })

    # Seed 40 edges
    edge_types = ["gig", "loan", "vouch", "transaction"]
    for i in range(40):
        from_id = random.choice(user_ids)
        to_id   = random.choice([u for u in user_ids if u != from_id])
        days_ago = random.randint(0, 14)
        db.collection("edges").add({
            "fromUserId": from_id,
            "toUserId":   to_id,
            "type":       random.choice(edge_types),
            "weight":     round(random.uniform(0.3, 1.0), 2),
            "createdAt":  datetime.utcnow() - timedelta(days=days_ago)
        })

    print("✅ Seeded 15 users + 40 edges")

if __name__ == "__main__":
    seed()