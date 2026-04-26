import os
import sys
from google.cloud import firestore

# Add the parent directory to sys.path so we can import lib.firestore
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.firestore import db

def init_schema():
    print("Initializing Firestore schema...")

    arjun_uid = "xK9mP2qRsT4vWz8Ybc3N"
    meena_uid = "yL0nQ3rStU5wX09Zcd4M"
    officer_uid = "zM1oR4sTuV6xY10Aef5O"

    # 1. /users
    print("Creating /users...")
    db.collection("users").document(arjun_uid).set({
        "name": "Arjun Kumar",
        "trade": "carpenter",
        "district": "Mysuru",
        "role": "youth",
        "trustScore": 20,
        "skillTokens": 0,
        "level": 1,
        "certTier": "bronze",
        "certTrustWeight": 0.2,
        "avgGigRating": 0,
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    db.collection("users").document(meena_uid).set({
        "name": "Meena",
        "trade": "vendor",
        "district": "Mysuru",
        "role": "vendor",
        "trustScore": 50,
        "skillTokens": 10,
        "level": 2,
        "certTier": "silver",
        "certTrustWeight": 0.5,
        "avgGigRating": 4.5,
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    db.collection("users").document(officer_uid).set({
        "name": "Officer",
        "trade": "officer",
        "district": "Mysuru",
        "role": "officer",
        "trustScore": 100,
        "skillTokens": 0,
        "level": 5,
        "certTier": "master",
        "certTrustWeight": 1.0,
        "avgGigRating": 5.0,
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    # 2. /analytics
    print("Creating /analytics...")
    db.collection("analytics").document("velocity").set({
        "score": 0,
        "delta": 0,
        "trend": "flat",
        "thisWeek": 0,
        "lastWeek": 0
    })

    db.collection("analytics").document("bridgeNodes").set({
        "nodes": []
    })

    db.collection("analytics").document("commonsFund").set({
        "balance": 0,
        "proposals": []
    })

    # 3. /gigs
    print("Creating /gigs...")
    db.collection("gigs").document(f"GIG-{meena_uid[:4]}-a3f91b2c").set({
        "vendorId": meena_uid,
        "title": "Sand and finish a teak bookshelf",
        "tradeRequired": "carpenter",
        "tokensReward": 2,
        "status": "open",
        "district": "Mysuru",
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    # 4. /edges
    print("Creating /edges...")
    db.collection("edges").document().set({
        "fromUserId": arjun_uid,
        "toUserId": meena_uid,
        "type": "gig",
        "weight": 1.0,
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    # 5. /loans
    print("Creating /loans...")
    db.collection("loans").document(f"LOAN-{arjun_uid[:4]}-7d3e1a9f").set({
        "applicantId": arjun_uid,
        "amount": 5000,
        "purpose": "Buy carpentry tools",
        "duration": 6,
        "score": 0,
        "decision": "pending",
        "maxAmount": 0,
        "status": "pending",
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    # 6. /inventory
    print("Creating /inventory...")
    db.collection("inventory").document().set({
        "vendorId": meena_uid,
        "productName": "Teak bookshelf",
        "stock": 8,
        "avgWeeklySales": 3,
        "updatedAt": firestore.SERVER_TIMESTAMP
    })

    # 7. /work_entries
    print("Creating /work_entries...")
    db.collection("work_entries").document().set({
        "userId": arjun_uid,
        "trade": "carpenter",
        "claimedLevel": "intermediate",
        "workDescription": "Built a wardrobe for a client in Mandya",
        "fileType": "image",
        "geoVerified": True,
        "workLocation": "Maddur, Mandya, Karnataka",
        "distanceKm": 61.3,
        "aiScore": 74,
        "aiComplexity": "intermediate",
        "aiLevelMatch": True,
        "entryTrustWeight": 0.817,
        "status": "verified",
        "submittedAt": firestore.SERVER_TIMESTAMP
    })

    # 8. /certificates
    print("Creating /certificates...")
    db.collection("certificates").document(arjun_uid).set({
        "certificateId": "GS-CARP-A3F91B2C",
        "userId": arjun_uid,
        "holderName": "Arjun Kumar",
        "trade": "carpenter",
        "district": "Mysuru",
        "tier": "bronze",
        "tierDescription": "Declared Artisan",
        "verifiedEntries": 0,
        "geoVerifiedEntries": 0,
        "avgAiScore": 0,
        "certTrustWeight": 0.2,
        "verifyUrl": "https://gramsphere.web.app/verify/GS-CARP-A3F91B2C",
        "issuedAt": firestore.SERVER_TIMESTAMP,
        "lastUpdated": firestore.SERVER_TIMESTAMP
    })

    print("Successfully seeded database!")

if __name__ == "__main__":
    init_schema()
