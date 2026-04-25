from fastapi import APIRouter
from lib.firestore import db
from lib.graph_engine import (
    get_cluster_velocity,
    detect_bridge_nodes,
    compute_trust_score
)
from collections import defaultdict

router = APIRouter()


# ── GET /graph/data ──────────────────────────────────────
@router.get("/graph/data")
async def get_graph_data():
    """Returns all nodes and edges for D3 visualization."""
    users = [
        {"id": d.id, **d.to_dict()}
        for d in db.collection("users").stream()
    ]
    edges = [
        {"id": d.id, **d.to_dict()}
        for d in db.collection("edges").stream()
    ]
    return {"nodes": users, "edges": edges}


# ── GET /graph/velocity ──────────────────────────────────
@router.get("/graph/velocity")
async def cluster_velocity():
    return get_cluster_velocity()


# ── GET /graph/bridge-nodes ──────────────────────────────
@router.get("/graph/bridge-nodes")
async def bridge_nodes():
    return {"bridgeNodes": detect_bridge_nodes()}


# ── GET /cluster/{district}/stats ────────────────────────
@router.get("/cluster/{district}/stats")
async def cluster_stats(district: str):
    users = [
        d.to_dict() for d in
        db.collection("users").where("district", "==", district).stream()
    ]
    if not users:
        return {"district": district, "totalUsers": 0}

    avg_trust = round(
        sum(u.get("trustScore", 0) for u in users) / len(users), 1
    )

    # Count trade distribution
    trade_counts = defaultdict(int)
    for u in users:
        trade_counts[u.get("trade", "unknown")] += 1
    top_trade = max(trade_counts, key=trade_counts.get)

    # Count loans + gigs in this district
    user_ids = [u.get("id") for u in users if u.get("id")]
    loans = [
        d.to_dict() for d in db.collection("loans").stream()
        if d.to_dict().get("applicantId") in user_ids
    ]

    velocity = get_cluster_velocity()

    return {
        "district":       district,
        "totalUsers":     len(users),
        "avgTrustScore":  avg_trust,
        "topTrade":       top_trade,
        "totalLoans":     len(loans),
        "velocityScore":  velocity["score"],
        "velocityTrend":  velocity["trend"]
    }