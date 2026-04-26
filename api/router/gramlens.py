from fastapi import APIRouter
from sqlalchemy import text
from lib.sql_connect import engine
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
    with engine.connect() as conn:
        users = conn.execute(text("SELECT * FROM users")).fetchall()
        edges = conn.execute(text("SELECT * FROM edges")).fetchall()
        
    return {
        "nodes": [dict(u._mapping) for u in users], 
        "edges": [dict(e._mapping) for e in edges]
    }


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
    with engine.connect() as conn:
        users = conn.execute(text("""
            SELECT u.*, s.skill_type as trade 
            FROM users u
            LEFT JOIN user_skills s ON u.id = s.user_id AND s.is_primary_skill = TRUE
            WHERE u.current_district = :district
        """), {"district": district}).fetchall()

        all_edges_result = conn.execute(text("SELECT COUNT(*) FROM edges")).scalar()
        total_edges = all_edges_result or 0
        
        all_users_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0

    if not users:
        return {
            "district": district, "total_users": 0,
            "total_edges": total_edges, "network_density": 0,
            "avg_trust_score": 0, "top_trade": "N/A"
        }

    n = len(users)
    avg_trust = round(sum(float(u.trust_score or 0) for u in users) / n, 1)

    trade_counts = defaultdict(int)
    for u in users:
        trade = getattr(u, 'trade', 'unknown') or 'unknown'
        trade_counts[trade] += 1
    top_trade = max(trade_counts, key=trade_counts.get) if trade_counts else "N/A"

    # Network density: actual_edges / max_possible_edges (across full network)
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
