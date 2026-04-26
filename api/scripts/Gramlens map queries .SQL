-- ═══════════════════════════════════════════════════════════════════
-- GramSphere — MSME Officer Google Maps Graph Queries
-- Town: Mysuru, Karnataka
--
-- These queries power the 3 layers on the Google Maps view:
--   Layer 1 → Merchant anchor nodes  (red pins)
--   Layer 2 → Employed user nodes    (green pins + edge lines)
--   Layer 3 → Unemployed user nodes  (grey pins, no edges)
-- ═══════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────
-- QUERY 1 — MERCHANT ANCHOR NODES
-- Returns one row per merchant.
-- Frontend plots these as RED pins on Google Maps.
-- Each pin is the graph anchor. Edges radiate outward from here.
-- ───────────────────────────────────────────────────────────────────

SELECT
    m.id                                AS merchant_id,
    m.shop_name,
    m.business_type,
    m.shop_address_line,
    m.shop_city,
    m.shop_district,
    m.shop_latitude                     AS lat,
    m.shop_longitude                    AS lng,
    m.is_verified,

    -- Workforce counts (for pin label and sidebar)
    COUNT(mw.id)                        AS total_active_employees,
    COUNT(DISTINCT us.skill_type)       AS distinct_skills_employed,

    -- Average trust score of workforce (cluster health indicator)
    ROUND(AVG(u_worker.trust_score), 1) AS avg_workforce_trust,

    -- Primary shop image for the map info window
    mi.image_url                        AS primary_image_url,

    -- Merchant user details for sidebar
    u_merchant.full_name                AS owner_name,
    u_merchant.phone_number             AS owner_phone

FROM merchants m

JOIN users u_merchant
    ON u_merchant.id = m.user_id

LEFT JOIN merchant_workforce mw
    ON mw.merchant_id = m.id
    AND mw.status = 'active'

LEFT JOIN users u_worker
    ON u_worker.id = mw.user_id

LEFT JOIN user_skills us
    ON us.user_id = u_worker.id
    AND us.is_primary_skill = TRUE

LEFT JOIN merchant_images mi
    ON mi.merchant_id = m.id
    AND mi.is_primary = TRUE

WHERE m.shop_district = 'Mysuru'        -- filter to the officer's jurisdiction

GROUP BY
    m.id, m.shop_name, m.business_type,
    m.shop_address_line, m.shop_city, m.shop_district,
    m.shop_latitude, m.shop_longitude, m.is_verified,
    mi.image_url, u_merchant.full_name, u_merchant.phone_number

ORDER BY total_active_employees DESC;


-- ───────────────────────────────────────────────────────────────────
-- QUERY 2 — GRAPH EDGES (Employed users → their merchant)
-- Returns one row per employed worker.
-- Frontend uses from_lat/from_lng → to_lat/to_lng to draw
-- a polyline (edge) from the worker's home to the merchant's shop.
-- Pin color: GREEN (employed)
-- ───────────────────────────────────────────────────────────────────

SELECT
    -- Edge identifiers
    mw.id                               AS edge_id,
    'employed'                          AS node_type,

    -- Worker node (edge start — home location)
    u.id                                AS user_id,
    u.full_name                         AS worker_name,
    u.latitude                          AS from_lat,
    u.longitude                         AS from_lng,
    u.trust_score,
    u.cert_tier,
    u.skill_tokens,

    -- Worker skill
    us.skill_type,
    us.proficiency_level,
    er.job_title,
    er.client_rating,

    -- Employment details
    mw.role_at_shop,
    mw.hired_date,
    mw.status                           AS employment_status,

    -- Merchant node (edge end — shop location, the anchor)
    m.id                                AS merchant_id,
    m.shop_name,
    m.shop_latitude                     AS to_lat,
    m.shop_longitude                    AS to_lng,

    -- Edge weight for graph thickness (thicker = longer tenure)
    EXTRACT(
        DAY FROM NOW() - mw.hired_date::timestamp
    )::INTEGER                          AS tenure_days,

    -- Badge count for node size on map
    (
        SELECT COUNT(*)
        FROM skill_badges sb
        WHERE sb.user_id = u.id
          AND sb.is_valid = TRUE
    )                                   AS badge_count,

    -- Certificate verify URL for the info window
    c.verify_url,
    c.tier                              AS cert_tier_full

FROM merchant_workforce mw

JOIN users u
    ON u.id = mw.user_id

JOIN merchants m
    ON m.id = mw.merchant_id

LEFT JOIN user_skills us
    ON us.user_id = u.id
    AND us.is_primary_skill = TRUE

LEFT JOIN employment_records er
    ON er.id = mw.employment_record_id

LEFT JOIN certificates c
    ON c.user_id = u.id
    AND c.skill_type = us.skill_type

WHERE mw.status = 'active'
  AND m.shop_district = 'Mysuru'

ORDER BY m.shop_name, u.trust_score DESC;


-- ───────────────────────────────────────────────────────────────────
-- QUERY 3 — UNEMPLOYED USERS (isolated nodes)
-- Users in Mysuru district with no active employment.
-- Frontend plots these as GREY pins with no outgoing edges.
-- These are the people the MSME officer should target with schemes.
-- ───────────────────────────────────────────────────────────────────

SELECT
    u.id                                AS user_id,
    'unemployed'                        AS node_type,
    u.full_name,
    u.latitude                          AS lat,
    u.longitude                         AS lng,
    u.trust_score,
    u.cert_tier,
    u.skill_tokens,
    u.current_city,

    -- Primary skill
    us.skill_type,
    us.proficiency_level,
    us.years_of_experience,

    -- How long since they last worked (days since last employment ended)
    COALESCE(
        EXTRACT(
            DAY FROM NOW() - MAX(er.end_date)::timestamp
        )::INTEGER,
        NULL
    )                                   AS days_since_last_employed,

    -- Certificate details
    c.cert_trust_weight,
    c.verified_media_count,
    c.badges_earned_count,
    c.verify_url,

    -- Nearest merchant (for the officer to suggest placement)
    -- Computed using basic Pythagorean approximation
    -- (accurate enough at city scale, no PostGIS needed)
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
    ON us.user_id = u.id
    AND us.is_primary_skill = TRUE

LEFT JOIN employment_records er
    ON er.user_id = u.id

LEFT JOIN certificates c
    ON c.user_id = u.id
    AND c.skill_type = us.skill_type

WHERE u.role         = 'user'
  AND u.current_district = 'Mysuru'
  AND u.id NOT IN (
      SELECT mw.user_id
      FROM merchant_workforce mw
      WHERE mw.status = 'active'
  )

GROUP BY
    u.id, u.full_name, u.latitude, u.longitude,
    u.trust_score, u.cert_tier, u.skill_tokens, u.current_city,
    us.skill_type, us.proficiency_level, us.years_of_experience,
    c.cert_trust_weight, c.verified_media_count,
    c.badges_earned_count, c.verify_url

ORDER BY u.trust_score DESC;


-- ───────────────────────────────────────────────────────────────────
-- QUERY 4 — CLUSTER SUMMARY (top of GramLens dashboard)
-- One row for the entire Mysuru district.
-- Powers the Cluster Velocity Score widget.
-- ───────────────────────────────────────────────────────────────────

SELECT
    'Mysuru'                            AS district,

    COUNT(DISTINCT u.id)
        FILTER (WHERE u.role = 'user')  AS total_workers,

    COUNT(DISTINCT mw.user_id)
        FILTER (WHERE mw.status='active') AS employed_workers,

    COUNT(DISTINCT u.id)
        FILTER (
            WHERE u.role = 'user'
            AND u.id NOT IN (
                SELECT user_id FROM merchant_workforce WHERE status='active'
            )
        )                               AS unemployed_workers,

    COUNT(DISTINCT m.id)                AS total_merchants,

    ROUND(AVG(u.trust_score)
        FILTER (WHERE u.role='user'), 1) AS avg_worker_trust_score,

    COUNT(DISTINCT sb.id)               AS total_badges_issued,

    (
        SELECT us2.skill_type
        FROM user_skills us2
        JOIN users u2 ON u2.id = us2.user_id AND u2.role = 'user'
        WHERE u2.current_district = 'Mysuru'
          AND us2.is_primary_skill = TRUE
        GROUP BY us2.skill_type
        ORDER BY COUNT(*) DESC
        LIMIT 1
    )                                   AS dominant_skill,

    ROUND(
        COUNT(DISTINCT mw.user_id)
            FILTER (WHERE mw.status='active') * 100.0
        / NULLIF(COUNT(DISTINCT u.id) FILTER (WHERE u.role='user'), 0),
        1
    )                                   AS employment_rate_pct

FROM users u

LEFT JOIN merchant_workforce mw    ON mw.user_id   = u.id
LEFT JOIN merchants m              ON m.user_id     = u.id
LEFT JOIN skill_badges sb          ON sb.user_id    = u.id

WHERE u.current_district = 'Mysuru';


-- ───────────────────────────────────────────────────────────────────
-- QUERY 5 — SKILL DISTRIBUTION (for GramLens filter bar)
-- Breakdown of skills across employed and unemployed in Mysuru.
-- ───────────────────────────────────────────────────────────────────

SELECT
    us.skill_type,
    COUNT(*)                            AS total_users,
    COUNT(*) FILTER (
        WHERE u.id IN (
            SELECT user_id FROM merchant_workforce WHERE status='active'
        )
    )                                   AS employed_count,
    COUNT(*) FILTER (
        WHERE u.id NOT IN (
            SELECT user_id FROM merchant_workforce WHERE status='active'
        )
    )                                   AS unemployed_count,
    ROUND(AVG(u.trust_score), 1)        AS avg_trust_score,
    COUNT(*) FILTER (
        WHERE u.cert_tier IN ('gold','master')
    )                                   AS high_cert_count

FROM user_skills us
JOIN users u
    ON u.id    = us.user_id
    AND u.role = 'user'
    AND u.current_district = 'Mysuru'

WHERE us.is_primary_skill = TRUE

GROUP BY us.skill_type
ORDER BY total_users DESC;