import networkx as nx
from lib.firestore import db
from datetime import datetime, timedelta
from cachetools import TTLCache

# In-memory caches — survives the request lifecycle
trust_cache    = TTLCache(maxsize=200, ttl=5)   # 5s TTL
velocity_cache = TTLCache(maxsize=1,  ttl=10)   # 10s TTL
bridge_cache   = TTLCache(maxsize=1,  ttl=60)   # 60s TTL


def build_graph() -> nx.DiGraph:
    """Fetch all edges from Firestore and build a NetworkX DiGraph."""
    G = nx.DiGraph()
    edges_ref = db.collection("edges").stream()
    for doc in edges_ref:
        e = doc.to_dict()
        G.add_edge(
            e["fromUserId"],
            e["toUserId"],
            weight=e.get("weight", 1.0),
            type=e.get("type", "gig"),
            createdAt=e.get("createdAt")
        )
    return G


def compute_trust_score(user_id: str) -> float:
    """
    Trust score = weighted sum of:
      - Degree centrality         (40%)
      - Recent activity (7 days)  (30%)
      - Vouch/employment rate     (30%)
    Returns a score from 0–100.
    """
    if user_id in trust_cache:
        return trust_cache[user_id]

    G = build_graph()

    if user_id not in G:
        trust_cache[user_id] = 20.0   # default for new users
        return 20.0

    total_nodes = max(G.number_of_nodes(), 1)

    # 1. Degree centrality
    degree = G.degree(user_id)
    degree_score = min(degree / total_nodes, 1.0)

    # 2. Recent activity — edges in the last 7 days
    cutoff = datetime.utcnow() - timedelta(days=7)
    recent = sum(
        1 for _, _, data in G.edges(user_id, data=True)
        if data.get("createdAt") and data["createdAt"].replace(tzinfo=None) > cutoff
    )
    recent_score = min(recent / 10, 1.0)   # cap at 10 recent edges

    # 3. Employment/vouch rate — ratio of employment or vouch edges
    employment_edges = [
        d for _, _, d in G.edges(user_id, data=True)
        if d.get("type") in ("employment", "vouch", "gig")
    ]
    vouch_rate = min(len(employment_edges) / 5, 1.0) if employment_edges else 0.5

    # Pull certificate trust weight from Firestore
    user_doc    = db.collection("users").document(user_id).get().to_dict() or {}
    cert_weight = user_doc.get("certTrustWeight", 0)   # 0.2 to 1.0

    # Blend into final score: certificate boosts the ceiling
    base_score = (
        degree_score * 0.4 +
        recent_score * 0.3 +
        vouch_rate   * 0.3
    ) * 100

    # Certificate acts as a multiplier on top, adds up to 25 points
    cert_boost  = cert_weight * 25
    final_score = min(base_score + cert_boost, 100)

    result = round(final_score, 1)
    trust_cache[user_id] = result
    return result


def get_cluster_velocity() -> dict:
    """
    Cluster Velocity Score:
    How fast are new edges being created this week vs last week?
    """
    if "velocity" in velocity_cache:
        return velocity_cache["velocity"]

    now = datetime.utcnow()
    this_week_start = now - timedelta(days=7)
    last_week_start = now - timedelta(days=14)

    edges = db.collection("edges").stream()
    this_week = 0
    last_week = 0

    for doc in edges:
        created = doc.to_dict().get("createdAt")
        if not created:
            continue
        created = created.replace(tzinfo=None)
        if created > this_week_start:
            this_week += 1
        elif created > last_week_start:
            last_week += 1

    if last_week == 0:
        delta = this_week * 100   # first week, everything is growth
    else:
        delta = round((this_week - last_week) / last_week * 100, 1)

    trend = "up" if delta > 0 else ("down" if delta < 0 else "flat")

    result = {
        "score":     this_week,
        "delta":     delta,
        "trend":     trend,
        "thisWeek":  this_week,
        "lastWeek":  last_week
    }

    # Write to Firestore so frontend onSnapshot() picks it up
    db.collection("analytics").document("velocity").set(result)

    velocity_cache["velocity"] = result
    return result


def detect_bridge_nodes() -> list:
    """
    Bridge nodes = articulation points in the undirected version of the graph.
    Removing them disconnects the cluster network.
    """
    if "bridges" in bridge_cache:
        return bridge_cache["bridges"]

    G = build_graph()
    U = G.to_undirected()   # articulation_points needs undirected graph

    if U.number_of_nodes() < 3:
        return []

    # NetworkX does the hard work in one line
    articulation_pts = list(nx.articulation_points(U))

    # Rank by disconnection impact
    results = []
    for node in articulation_pts:
        U_copy = U.copy()
        U_copy.remove_node(node)
        components = nx.number_connected_components(U_copy)
        results.append({
            "userId":              node,
            "disconnects":         components - 1,
            "wouldIsolate":        U.degree(node)
        })

    results.sort(key=lambda x: x["disconnects"], reverse=True)
    top3 = results[:3]

    # Write to Firestore for frontend
    db.collection("analytics").document("bridgeNodes").set({"nodes": top3})

    bridge_cache["bridges"] = top3
    return top3


def get_neighbor_avg_trust(user_id: str) -> float:
    """Returns average trust score of a user's direct neighbors."""
    G = build_graph()
    neighbors = list(G.neighbors(user_id))
    if not neighbors:
        return 0.0
    scores = [compute_trust_score(n) for n in neighbors]
    return round(sum(scores) / len(scores), 1)