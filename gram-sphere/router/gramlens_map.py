"""
routes/gramlens_map.py
──────────────────────
Single endpoint that returns everything the Google Maps
graph layer needs in one response.

Frontend calls:  GET /api/gramlens/map-data?district=Mysuru
Returns:
  - merchant_nodes  → red anchor pins
  - employed_edges  → green pins + polylines to their merchant
  - unemployed_nodes → grey isolated pins
  - cluster_summary → top dashboard widget data
  - skill_breakdown → filter bar data
"""

from fastapi       import APIRouter, HTTPException, Query
from lib.firestore import get_pg_connection   # see note below

router = APIRouter()


# ── NOTE on database connection ───────────────────────────────────
# Add this to lib/firestore.py (or a new lib/database.py):
#
#   import psycopg2, os
#   from psycopg2.extras import RealDictCursor
#
#   def get_pg_connection():
#       return psycopg2.connect(
#           os.getenv("DATABASE_URL"),
#           cursor_factory=RealDictCursor   # returns rows as dicts
#       )
#
# RealDictCursor means rows come back as { "col": val } dicts
# instead of tuples — directly JSON-serialisable.
# ─────────────────────────────────────────────────────────────────


@router.get("/gramlens/map-data")
async def gramlens_map_data(
    district: str = Query(default="Mysuru", description="District to filter by")
):
    """
    Returns all data needed to render the GramLens Google Maps
    graph overlay in a single HTTP call.

    Three layers:
      merchant_nodes   → anchor pins (red)
      employed_edges   → worker pins + polylines (green)
      unemployed_nodes → isolated worker pins (grey)
    """

    try:
        conn = get_pg_connection()
        cur  = conn.cursor()

        # ── Layer 1: Merchant anchor nodes ───────────────────────────
        cur.execute("""
            SELECT
                m.id                                AS merchant_id,
                m.shop_name,
                m.business_type,
                m.shop_address_line,
                m.shop_city,
                m.shop_district,
                CAST(m.shop_latitude  AS FLOAT)     AS lat,
                CAST(m.shop_longitude AS FLOAT)     AS lng,
                m.is_verified,
                COUNT(mw.id)                        AS total_active_employees,
                COUNT(DISTINCT us.skill_type)       AS distinct_skills_employed,
                ROUND(AVG(u_worker.trust_score)::numeric, 1)
                                                    AS avg_workforce_trust,
                mi.image_url                        AS primary_image_url,
                u_merchant.full_name                AS owner_name,
                u_merchant.phone_number             AS owner_phone
            FROM merchants m
            JOIN  users u_merchant
                  ON u_merchant.id = m.user_id
            LEFT JOIN merchant_workforce mw
                  ON mw.merchant_id = m.id AND mw.status = 'active'
            LEFT JOIN users u_worker
                  ON u_worker.id = mw.user_id
            LEFT JOIN user_skills us
                  ON us.user_id = u_worker.id AND us.is_primary_skill = TRUE
            LEFT JOIN merchant_images mi
                  ON mi.merchant_id = m.id AND mi.is_primary = TRUE
            WHERE m.shop_district = %s
            GROUP BY
                m.id, m.shop_name, m.business_type,
                m.shop_address_line, m.shop_city, m.shop_district,
                m.shop_latitude, m.shop_longitude, m.is_verified,
                mi.image_url, u_merchant.full_name, u_merchant.phone_number
            ORDER BY total_active_employees DESC
        """, (district,))
        merchant_nodes = [dict(r) for r in cur.fetchall()]

        # ── Layer 2: Employed edges (worker → merchant) ──────────────
        cur.execute("""
            SELECT
                mw.id                               AS edge_id,
                'employed'                          AS node_type,
                u.id                                AS user_id,
                u.full_name                         AS worker_name,
                CAST(u.latitude  AS FLOAT)          AS from_lat,
                CAST(u.longitude AS FLOAT)          AS from_lng,
                CAST(u.trust_score AS FLOAT)        AS trust_score,
                u.cert_tier,
                u.skill_tokens,
                us.skill_type,
                us.proficiency_level,
                er.job_title,
                CAST(er.client_rating AS FLOAT)     AS client_rating,
                mw.role_at_shop,
                mw.hired_date,
                mw.status                           AS employment_status,
                m.id                                AS merchant_id,
                m.shop_name,
                CAST(m.shop_latitude  AS FLOAT)     AS to_lat,
                CAST(m.shop_longitude AS FLOAT)     AS to_lng,
                EXTRACT(
                    DAY FROM NOW() - mw.hired_date::timestamp
                )::INTEGER                          AS tenure_days,
                (
                    SELECT COUNT(*) FROM skill_badges sb
                    WHERE sb.user_id = u.id AND sb.is_valid = TRUE
                )                                   AS badge_count,
                c.verify_url,
                c.tier                              AS cert_tier_full
            FROM merchant_workforce mw
            JOIN  users u           ON u.id  = mw.user_id
            JOIN  merchants m       ON m.id  = mw.merchant_id
            LEFT JOIN user_skills us
                  ON us.user_id = u.id AND us.is_primary_skill = TRUE
            LEFT JOIN employment_records er
                  ON er.id = mw.employment_record_id
            LEFT JOIN certificates c
                  ON c.user_id = u.id AND c.skill_type = us.skill_type
            WHERE mw.status = 'active'
              AND m.shop_district = %s
            ORDER BY m.shop_name, u.trust_score DESC
        """, (district,))
        employed_edges = [dict(r) for r in cur.fetchall()]

        # ── Layer 3: Unemployed isolated nodes ───────────────────────
        cur.execute("""
            SELECT
                u.id                                AS user_id,
                'unemployed'                        AS node_type,
                u.full_name,
                CAST(u.latitude  AS FLOAT)          AS lat,
                CAST(u.longitude AS FLOAT)          AS lng,
                CAST(u.trust_score AS FLOAT)        AS trust_score,
                u.cert_tier,
                u.skill_tokens,
                us.skill_type,
                us.proficiency_level,
                us.years_of_experience,
                c.cert_trust_weight,
                c.verified_media_count,
                c.badges_earned_count,
                c.verify_url,
                (
                    SELECT m.shop_name
                    FROM merchants m
                    ORDER BY
                        SQRT(
                            POWER((m.shop_latitude  - u.latitude)  * 111.0, 2) +
                            POWER((m.shop_longitude - u.longitude) * 111.0
                                  * COS(RADIANS(u.latitude)), 2)
                        )
                    LIMIT 1
                )                                   AS nearest_merchant,
                (
                    SELECT ROUND(
                        SQRT(
                            POWER((m.shop_latitude  - u.latitude)  * 111.0, 2) +
                            POWER((m.shop_longitude - u.longitude) * 111.0
                                  * COS(RADIANS(u.latitude)), 2)
                        )::numeric, 2)
                    FROM merchants m
                    ORDER BY
                        SQRT(
                            POWER((m.shop_latitude  - u.latitude)  * 111.0, 2) +
                            POWER((m.shop_longitude - u.longitude) * 111.0
                                  * COS(RADIANS(u.latitude)), 2)
                        )
                    LIMIT 1
                )                                   AS nearest_merchant_km
            FROM users u
            LEFT JOIN user_skills us
                  ON us.user_id = u.id AND us.is_primary_skill = TRUE
            LEFT JOIN certificates c
                  ON c.user_id = u.id AND c.skill_type = us.skill_type
            WHERE u.role             = 'user'
              AND u.current_district = %s
              AND u.id NOT IN (
                  SELECT mw.user_id FROM merchant_workforce mw
                  WHERE mw.status = 'active'
              )
            ORDER BY u.trust_score DESC
        """, (district,))
        unemployed_nodes = [dict(r) for r in cur.fetchall()]

        # ── Cluster summary ──────────────────────────────────────────
        cur.execute("""
            SELECT
                %s                                  AS district,
                COUNT(DISTINCT u.id)
                    FILTER (WHERE u.role='user')    AS total_workers,
                COUNT(DISTINCT mw.user_id)
                    FILTER (WHERE mw.status='active') AS employed_workers,
                COUNT(DISTINCT u.id) FILTER (
                    WHERE u.role = 'user'
                    AND u.id NOT IN (
                        SELECT user_id FROM merchant_workforce
                        WHERE status='active'
                    )
                )                                   AS unemployed_workers,
                COUNT(DISTINCT m.id)                AS total_merchants,
                ROUND(AVG(u.trust_score)
                    FILTER (WHERE u.role='user')::numeric, 1)
                                                    AS avg_worker_trust_score,
                COUNT(DISTINCT sb.id)               AS total_badges_issued,
                ROUND(
                    COUNT(DISTINCT mw.user_id)
                        FILTER (WHERE mw.status='active') * 100.0
                    / NULLIF(
                        COUNT(DISTINCT u.id) FILTER (WHERE u.role='user'), 0
                    ),
                    1
                )                                   AS employment_rate_pct
            FROM users u
            LEFT JOIN merchant_workforce mw  ON mw.user_id = u.id
            LEFT JOIN merchants m            ON m.user_id  = u.id
            LEFT JOIN skill_badges sb        ON sb.user_id = u.id
            WHERE u.current_district = %s
        """, (district, district))
        cluster_summary = dict(cur.fetchone())

        # ── Skill breakdown ──────────────────────────────────────────
        cur.execute("""
            SELECT
                us.skill_type,
                COUNT(*)                            AS total_users,
                COUNT(*) FILTER (
                    WHERE u.id IN (
                        SELECT user_id FROM merchant_workforce
                        WHERE status='active'
                    )
                )                                   AS employed_count,
                COUNT(*) FILTER (
                    WHERE u.id NOT IN (
                        SELECT user_id FROM merchant_workforce
                        WHERE status='active'
                    )
                )                                   AS unemployed_count,
                ROUND(AVG(u.trust_score)::numeric, 1) AS avg_trust_score,
                COUNT(*) FILTER (
                    WHERE u.cert_tier IN ('gold','master')
                )                                   AS high_cert_count
            FROM user_skills us
            JOIN users u
                ON u.id = us.user_id
                AND u.role = 'user'
                AND u.current_district = %s
            WHERE us.is_primary_skill = TRUE
            GROUP BY us.skill_type
            ORDER BY total_users DESC
        """, (district,))
        skill_breakdown = [dict(r) for r in cur.fetchall()]

        cur.close()
        conn.close()

        # ── Shape the response for the frontend ──────────────────────
        return {
            "district": district,

            # Google Maps layers
            "merchant_nodes":   merchant_nodes,    # red anchor pins
            "employed_edges":   employed_edges,    # green pins + polylines
            "unemployed_nodes": unemployed_nodes,  # grey isolated pins

            # Dashboard widgets
            "cluster_summary":  cluster_summary,
            "skill_breakdown":  skill_breakdown,

            # Map bounds (frontend uses to fit the camera)
            "map_bounds": _compute_bounds(
                merchant_nodes, employed_edges, unemployed_nodes
            ),

            # Counts for the frontend to decide how to render
            "counts": {
                "merchants":   len(merchant_nodes),
                "employed":    len(employed_edges),
                "unemployed":  len(unemployed_nodes),
                "total_pins":  len(merchant_nodes) + len(employed_edges)
                               + len(unemployed_nodes),
                "total_edges": len(employed_edges),
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _compute_bounds(merchants, employed, unemployed) -> dict:
    """
    Returns NE and SW bounds of all coordinates.
    The frontend passes these to map.fitBounds() so the camera
    frames all nodes perfectly on load.
    """
    all_lats = (
        [m["lat"] for m in merchants] +
        [e["from_lat"] for e in employed] +
        [e["to_lat"]   for e in employed] +
        [u["lat"]      for u in unemployed]
    )
    all_lngs = (
        [m["lng"] for m in merchants] +
        [e["from_lng"] for e in employed] +
        [e["to_lng"]   for e in employed] +
        [u["lng"]      for u in unemployed]
    )

    if not all_lats:
        # Default to Mysuru city centre if no data
        return {
            "ne": {"lat": 12.40, "lng": 76.70},
            "sw": {"lat": 12.20, "lng": 76.58}
        }

    padding = 0.01   # ~1km padding around the outermost pins
    return {
        "ne": {"lat": max(all_lats) + padding, "lng": max(all_lngs) + padding},
        "sw": {"lat": min(all_lats) - padding, "lng": min(all_lngs) - padding}
    }