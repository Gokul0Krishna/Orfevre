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
        {"id": d.id, **d.to_dict()} for d in
        db.collection("users").where("district", "==", district).stream()
    ]

    all_edges = list(db.collection("edges").stream())
    total_edges = len(all_edges)

    if not users:
        return {
            "district": district, "total_users": 0,
            "total_edges": total_edges, "network_density": 0,
            "avg_trust_score": 0, "top_trade": "N/A"
        }

    n = len(users)
    avg_trust = round(sum(u.get("trustScore", 0) for u in users) / n, 1)

    trade_counts = defaultdict(int)
    for u in users:
        trade_counts[u.get("trade", "unknown")] += 1
    top_trade = max(trade_counts, key=trade_counts.get)

    # Network density: actual_edges / max_possible_edges (across full network)
    all_users_count = len(list(db.collection("users").stream()))
    max_edges = max(all_users_count * (all_users_count - 1), 1)
    density = round(total_edges / max_edges, 4)

    velocity = get_cluster_velocity()

    return {
        "district":       district,
        "total_users":    n,
        "total_edges":    total_edges,
        "network_density": density,
        "avg_trust_score": avg_trust,
        "top_trade":      top_trade,
        "velocity_score": velocity["score"],
        "velocity_trend": velocity["trend"],
    }