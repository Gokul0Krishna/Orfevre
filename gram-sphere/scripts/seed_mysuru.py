"""
GramSphere — Mysuru Seed Data
==============================
Town: Mysuru, Karnataka (12.2958°N, 76.6394°E)

Graph structure this data produces on Google Maps:
  - 4 Merchant nodes (anchors) at real Mysuru shop locations
  - 16 User nodes spread across Mysuru neighbourhoods
  - 12 employed users → edges to their merchant (employed)
  - 4 unemployed users → isolated nodes (no edges)
  - 1 MSME officer (policymaker view, no graph node)

Run:
    pip install psycopg2-binary python-dotenv
    python seed_mysuru.py

Requires .env with:
    DATABASE_URL=postgresql://user:password@host:5432/gramsphere
"""

import psycopg2
import uuid
import os
import random
from datetime import date, datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/gramsphere")

# ─────────────────────────────────────────────────────────────────────
# MYSURU REAL COORDINATES
# Each area is a real neighbourhood in Mysuru city.
# Spread deliberately so the graph looks good on Google Maps.
# ─────────────────────────────────────────────────────────────────────

MYSURU_AREAS = {
    # area_name:              (latitude,   longitude)
    "Chamundipuram":          (12.3053,    76.6468),
    "Kuvempunagar":           (12.3156,    76.6489),
    "Vijayanagar":            (12.3222,    76.6133),
    "Gokulam":                (12.3344,    76.6236),
    "Hebbal":                 (12.2758,    76.6547),
    "Lakshmipuram":           (12.3006,    76.6558),
    "Saraswathipuram":        (12.3178,    76.6350),
    "Jayalakshmipuram":       (12.3089,    76.6250),
    "Alanahalli":             (12.2850,    76.6250),
    "Bogadi":                 (12.3400,    76.6050),
    "Rajivnagar":             (12.2700,    76.6400),
    "Dattagalli":             (12.2900,    76.6100),
    "Siddalingapura":         (12.2750,    76.6600),
    "Metagalli":              (12.3500,    76.6200),
    "Udayagiri":              (12.2650,    76.6550),
    "Kesare":                 (12.2600,    76.6350),
    "Bannimantap":            (12.3050,    76.6150),
    "N R Mohalla":            (12.3100,    76.6400),
    "Mandi Mohalla":          (12.2950,    76.6500),
    "Bamboo Bazaar":          (12.2980,    76.6420),
}


def jitter(lat, lng, metres=200):
    """
    Adds a small random offset (up to `metres`) to coordinates.
    Keeps users in the same neighbourhood but not stacked on
    the exact same pixel on Google Maps.
    1 degree lat ≈ 111,000m  →  200m ≈ 0.0018 degrees
    """
    delta = metres / 111_000
    return (
        round(lat + random.uniform(-delta, delta), 7),
        round(lng + random.uniform(-delta, delta), 7),
    )


def uid():
    return str(uuid.uuid4())


def fake_firebase_uid():
    """Simulates the format of a real Firebase Auth UID."""
    chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "".join(random.choices(chars, k=28))


def past_date(days_min=30, days_max=730):
    return date.today() - timedelta(days=random.randint(days_min, days_max))


# ─────────────────────────────────────────────────────────────────────
# SEED DATA DEFINITIONS
# ─────────────────────────────────────────────────────────────────────

# Pre-generate UUIDs so foreign keys are consistent
IDS = {
    # MSME official
    "official_user":    uid(),
    "official_profile": uid(),

    # Merchants (user row + merchant row)
    "merchant_user_1":    uid(), "merchant_1": uid(),   # Ravi's Carpentry
    "merchant_user_2":    uid(), "merchant_2": uid(),   # Lakshmi Weaves
    "merchant_user_3":    uid(), "merchant_3": uid(),   # Suresh Pottery
    "merchant_user_4":    uid(), "merchant_4": uid(),   # Govind Cobbler Works

    # Workers — 16 users
    **{f"worker_{i}": uid() for i in range(1, 17)},

    # Skills
    **{f"skill_{i}": uid() for i in range(1, 17)},

    # Certificates
    **{f"cert_{i}": uid() for i in range(1, 17)},

    # Employment records
    **{f"emp_{i}": uid() for i in range(1, 13)},

    # Merchant workforce rows
    **{f"workforce_{i}": uid() for i in range(1, 13)},

    # Skill tasks
    "task_carp_beg": uid(), "task_carp_int": uid(), "task_carp_adv": uid(),
    "task_weav_beg": uid(), "task_weav_int": uid(),
    "task_pott_beg": uid(), "task_pott_int": uid(),
    "task_cobb_beg": uid(), "task_cobb_int": uid(),
    "task_arti_beg": uid(),

    # Badges
    **{f"badge_{i}": uid() for i in range(1, 13)},

    # Skill task attempts
    **{f"attempt_{i}": uid() for i in range(1, 13)},
}

# ─────────────────────────────────────────────────────────────────────
# WORKER DEFINITIONS
# Spread across Mysuru neighbourhoods.
# Employed workers: 1–12  (employed = True)
# Unemployed workers: 13–16 (employed = False)
# ─────────────────────────────────────────────────────────────────────

WORKERS = [
    # idx  name                    area                  skill         level          merchant_key     days_employed
    (1,  "Raju Naika",           "Chamundipuram",      "carpenter",  "intermediate", "merchant_1",    420),
    (2,  "Suresh Kumar",         "Vijayanagar",        "carpenter",  "advanced",     "merchant_1",    730),
    (3,  "Manjunath H",          "Dattagalli",         "carpenter",  "beginner",     "merchant_1",    90),
    (4,  "Praveen Gowda",        "Alanahalli",         "carpenter",  "intermediate", "merchant_1",    180),
    (5,  "Kavitha Devi",         "Saraswathipuram",    "weaver",     "advanced",     "merchant_2",    540),
    (6,  "Shanthamma B",         "Lakshmipuram",       "weaver",     "intermediate", "merchant_2",    300),
    (7,  "Rekha Nair",           "N R Mohalla",        "weaver",     "beginner",     "merchant_2",    60),
    (8,  "Usha Kumari",          "Hebbal",             "weaver",     "master",       "merchant_2",    900),
    (9,  "Ganesh Reddy",         "Jayalakshmipuram",   "potter",     "intermediate", "merchant_3",    240),
    (10, "Nagaraju S",           "Bogadi",             "potter",     "advanced",     "merchant_3",    480),
    (11, "Lokesh M",             "Metagalli",          "potter",     "beginner",     "merchant_3",    45),
    (12, "Basavaraj K",          "Bannimantap",        "cobbler",    "intermediate", "merchant_4",    360),
    # Unemployed — 13 to 16
    (13, "Venkatesha P",         "Rajivnagar",         "carpenter",  "beginner",     None,            0),
    (14, "Girija Bai",           "Kesare",             "artisan",    "intermediate", None,            0),
    (15, "Hanumanthu D",         "Udayagiri",          "weaver",     "beginner",     None,            0),
    (16, "Thimmaiah G",          "Siddalingapura",     "cobbler",    "beginner",     None,            0),
]

MERCHANT_DEFS = [
    {
        "key":          "merchant_1",
        "user_key":     "merchant_user_1",
        "name":         "Ravi Shankar",
        "email":        "ravi.shankar@gramsphere.in",
        "phone":        "9845012301",
        "shop_name":    "Ravi's Carpentry Works",
        "biz_type":     "Carpentry Workshop",
        "area":         "Kuvempunagar",
        "address":      "14, 5th Cross, Kuvempunagar, Mysuru",
        "pincode":      "570023",
    },
    {
        "key":          "merchant_2",
        "user_key":     "merchant_user_2",
        "name":         "Lakshmi Venkatesh",
        "email":        "lakshmi.v@gramsphere.in",
        "phone":        "9741023456",
        "shop_name":    "Lakshmi Silk Weaves",
        "biz_type":     "Weaving Unit",
        "area":         "Mandi Mohalla",
        "address":      "8, Mandi Mohalla, Near Clock Tower, Mysuru",
        "pincode":      "570021",
    },
    {
        "key":          "merchant_3",
        "user_key":     "merchant_user_3",
        "name":         "Suresh Babu",
        "email":        "suresh.pottery@gramsphere.in",
        "phone":        "9632145678",
        "shop_name":    "Suresh Traditional Pottery",
        "biz_type":     "Pottery Studio",
        "area":         "Bamboo Bazaar",
        "address":      "22, Pottery Lane, Bamboo Bazaar, Mysuru",
        "pincode":      "570001",
    },
    {
        "key":          "merchant_4",
        "user_key":     "merchant_user_4",
        "name":         "Govind Das",
        "email":        "govind.cobbler@gramsphere.in",
        "phone":        "8971234560",
        "shop_name":    "Govind Cobbler Works",
        "biz_type":     "Cobbler Workshop",
        "area":         "Gokulam",
        "address":      "3, Gokulam 3rd Stage, Mysuru",
        "pincode":      "570002",
    },
]

TASK_DEFS = [
    ("task_carp_beg", "carpenter", "beginner",     "Sand and finish a rough plank",              "Sand both sides of a rough teak plank to a smooth finish using 80-grit then 120-grit sandpaper. Show before and after.", 1, 30),
    ("task_carp_int", "carpenter", "intermediate", "Cut and fit a butt joint",                   "Measure, mark, and cut a clean butt joint between two pieces of wood. Show flush fit with no visible gap.", 2, 45),
    ("task_carp_adv", "carpenter", "advanced",     "Hand-cut a mortise and tenon joint",         "Cut a full mortise and tenon joint by hand — no power tools. Show marking, chiselling, and final fitted assembly.", 4, 90),
    ("task_weav_beg", "weaver",    "beginner",     "Warp a basic loom setup",                    "Set up a basic warp on a handloom frame with 20 threads. Show even tension across all threads.", 1, 40),
    ("task_weav_int", "weaver",    "intermediate", "Weave a 10cm plain weave sample",            "Weave a 10cm section of plain weave on a warped loom. Show consistent beat and selvedge edges.", 2, 60),
    ("task_pott_beg", "potter",    "beginner",     "Centre clay on a wheel",                     "Centre 500g of clay on a pottery wheel. Show three attempts — clay must be visibly centred before proceeding.", 1, 30),
    ("task_pott_int", "potter",    "intermediate", "Throw an open cylinder",                     "Throw a cylinder 15cm tall with even wall thickness from centred clay. No collapsing.", 2, 50),
    ("task_cobb_beg", "cobbler",   "beginner",     "Hand-stitch a leather patch",                "Stitch a 5x5cm leather patch onto a worn sole using saddle stitch. Show even stitch spacing.", 1, 25),
    ("task_cobb_int", "cobbler",   "intermediate", "Replace a heel on a men's shoe",             "Fully remove and replace a rubber heel on a standard men's shoe. Show clean edge alignment.", 2, 45),
    ("task_arti_beg", "artisan",   "beginner",     "Create a basic decorative motif in clay",    "Handcraft a 10cm decorative motif in air-dry clay. Show design planning and execution.", 1, 35),
]


# ─────────────────────────────────────────────────────────────────────
# SEEDER
# ─────────────────────────────────────────────────────────────────────

def seed(conn):
    cur = conn.cursor()

    print("⏳  Seeding GramSphere Mysuru data...")

    # ── 1. SKILL TASKS ───────────────────────────────────────────────
    print("   → skill_tasks")
    for t in TASK_DEFS:
        key, skill, level, title, desc, tokens, mins = t
        cur.execute("""
            INSERT INTO skill_tasks
              (id, skill_type, difficulty_level, task_title,
               task_description, tokens_reward, estimated_minutes, is_active)
            VALUES (%s,%s,%s,%s,%s,%s,%s,TRUE)
            ON CONFLICT (id) DO NOTHING
        """, (IDS[key], skill, level, title, desc, tokens, mins))

    # ── 2. MSME OFFICIAL ─────────────────────────────────────────────
    print("   → msme_official")
    off_lat, off_lng = MYSURU_AREAS["N R Mohalla"]
    cur.execute("""
        INSERT INTO users
          (id, firebase_uid, full_name, email, phone_number,
           role, current_city, current_district, current_state,
           latitude, longitude, trust_score, is_active)
        VALUES (%s,%s,%s,%s,%s,'msme_official','Mysuru','Mysuru','Karnataka',
                %s,%s,85.0,TRUE)
        ON CONFLICT (id) DO NOTHING
    """, (
        IDS["official_user"], fake_firebase_uid(),
        "Chandrashekar Murthy", "chandrashekar.msme@karnataka.gov.in",
        "9480012345", off_lat, off_lng
    ))
    cur.execute("""
        INSERT INTO msme_officials
          (id, user_id, department, designation,
           jurisdiction_district, employee_id, is_verified)
        VALUES (%s,%s,'MSME Department Karnataka',
                'District Industries Officer','Mysuru','KA-DIO-MYS-001',TRUE)
        ON CONFLICT (id) DO NOTHING
    """, (IDS["official_profile"], IDS["official_user"]))

    # ── 3. MERCHANT USERS + PROFILES ─────────────────────────────────
    print("   → merchants")
    for m in MERCHANT_DEFS:
        lat, lng = MYSURU_AREAS[m["area"]]
        shop_lat, shop_lng = jitter(lat, lng, metres=50)

        # users row
        cur.execute("""
            INSERT INTO users
              (id, firebase_uid, full_name, email, phone_number,
               role, current_city, current_district, current_state,
               latitude, longitude, trust_score, is_active)
            VALUES (%s,%s,%s,%s,%s,'merchant',
                    'Mysuru','Mysuru','Karnataka',%s,%s,70.0,TRUE)
            ON CONFLICT (id) DO NOTHING
        """, (
            IDS[m["user_key"]], fake_firebase_uid(),
            m["name"], m["email"], m["phone"],
            lat, lng
        ))

        # merchants row
        cur.execute("""
            INSERT INTO merchants
              (id, user_id, shop_name, business_type,
               shop_address_line, shop_city, shop_district, shop_state,
               shop_pincode, shop_latitude, shop_longitude,
               is_verified, verification_status)
            VALUES (%s,%s,%s,%s,%s,'Mysuru','Mysuru','Karnataka',
                    %s,%s,%s,TRUE,'verified')
            ON CONFLICT (id) DO NOTHING
        """, (
            IDS[m["key"]], IDS[m["user_key"]],
            m["shop_name"], m["biz_type"],
            m["address"], m["pincode"],
            shop_lat, shop_lng
        ))

        # 2–3 shop images per merchant
        image_types = ["shop_front", "interior", "products"]
        for idx, img_type in enumerate(image_types):
            cur.execute("""
                INSERT INTO merchant_images
                  (id, merchant_id, image_url, image_type,
                   caption, is_primary, display_order)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
            """, (
                uid(), IDS[m["key"]],
                f"https://storage.googleapis.com/gramsphere-images/{m['key']}_{img_type}.jpg",
                img_type,
                f"{img_type.replace('_',' ').title()} of {m['shop_name']}",
                idx == 0,   # first image is primary
                idx
            ))

    # ── 4. WORKERS ───────────────────────────────────────────────────
    print("   → users (workers)")
    for w in WORKERS:
        idx, name, area, skill, level, merchant_key, days_emp = w
        area_lat, area_lng = MYSURU_AREAS[area]
        u_lat, u_lng = jitter(area_lat, area_lng, metres=150)

        # trust score: higher for longer employed, higher for higher skill level
        level_boost  = {"beginner":0,"intermediate":15,"advanced":30,"master":45}[level]
        emp_boost    = min(days_emp / 30, 20)   # max 20 points from tenure
        trust_score  = round(min(25 + level_boost + emp_boost, 95), 1)

        skill_tokens = {"beginner":0,"intermediate":2,"advanced":4,"master":6}[level]
        cert_tier    = {"beginner":"bronze","intermediate":"silver",
                        "advanced":"gold","master":"master"}[level]
        cert_weight  = {"bronze":0.20,"silver":0.50,"gold":0.80,"master":1.00}[cert_tier]

        email = f"{name.lower().replace(' ','.')}.{idx}@gramsphere.in"

        cur.execute("""
            INSERT INTO users
              (id, firebase_uid, full_name, email, phone_number,
               role, current_city, current_district, current_state,
               latitude, longitude, trust_score, skill_tokens,
               cert_tier, cert_trust_weight, is_active)
            VALUES (%s,%s,%s,%s,%s,'user',
                    'Mysuru','Mysuru','Karnataka',
                    %s,%s,%s,%s,%s,%s,TRUE)
            ON CONFLICT (id) DO NOTHING
        """, (
            IDS[f"worker_{idx}"], fake_firebase_uid(),
            name, email,
            f"9{random.randint(600000000,999999999)}",
            u_lat, u_lng,
            trust_score, skill_tokens, cert_tier, cert_weight
        ))

        # ── user_skills ──────────────────────────────────────────────
        cur.execute("""
            INSERT INTO user_skills
              (id, user_id, skill_type, proficiency_level,
               years_of_experience, is_primary_skill)
            VALUES (%s,%s,%s,%s,%s,TRUE)
            ON CONFLICT (id) DO NOTHING
        """, (
            IDS[f"skill_{idx}"],
            IDS[f"worker_{idx}"],
            skill, level,
            {"beginner":1,"intermediate":3,"advanced":6,"master":10}[level]
        ))

        # ── certificates ─────────────────────────────────────────────
        cert_code    = f"GS-{skill[:4].upper()}-{IDS[f'worker_{idx}'][:8].upper()}"
        badges_count = skill_tokens
        media_count  = max(badges_count, 1)
        avg_ai       = {
            "beginner":  round(random.uniform(35, 55), 1),
            "intermediate": round(random.uniform(55, 72), 1),
            "advanced":  round(random.uniform(72, 88), 1),
            "master":    round(random.uniform(88, 97), 1),
        }[level]

        cur.execute("""
            INSERT INTO certificates
              (id, user_id, user_skill_id, certificate_code,
               skill_type, tier, tier_description,
               verified_media_count, geo_verified_media_count,
               badges_earned_count, avg_ai_score, avg_gig_rating,
               cert_trust_weight,
               verify_url, issued_at, last_updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
            ON CONFLICT (id) DO NOTHING
        """, (
            IDS[f"cert_{idx}"],
            IDS[f"worker_{idx}"],
            IDS[f"skill_{idx}"],
            cert_code, skill, cert_tier,
            {
                "bronze":  "Declared Artisan",
                "silver":  "Portfolio Verified Artisan",
                "gold":    "Track Record Verified Artisan",
                "master":  "Market Proven Artisan"
            }[cert_tier],
            media_count,
            media_count,        # all geo-verified
            badges_count,
            avg_ai,
            round(random.uniform(3.8, 5.0), 1) if days_emp > 0 else 0.0,
            cert_weight,
            f"https://gramsphere.web.app/verify/{cert_code}"
        ))

        # ── skill_media (portfolio photos) ───────────────────────────
        # Only for non-beginners — beginners have no portfolio yet
        if level != "beginner":
            for m_idx in range(media_count):
                # GPS near the merchant's shop (where work was done)
                if merchant_key:
                    m_area   = next(
                        m["area"] for m in MERCHANT_DEFS
                        if m["key"] == merchant_key
                    )
                    base_lat, base_lng = MYSURU_AREAS[m_area]
                else:
                    base_lat, base_lng = jitter(u_lat, u_lng, 500)

                w_lat, w_lng = jitter(base_lat, base_lng, metres=100)
                dist         = round(
                    ((u_lat - w_lat)**2 + (u_lng - w_lng)**2)**0.5 * 111_000,
                    1
                )

                cur.execute("""
                    INSERT INTO skill_media
                      (id, user_id, user_skill_id, file_url, file_type,
                       file_size_mb, mime_type,
                       exif_latitude, exif_longitude, exif_source,
                       geo_verified, geo_distance_km, geo_work_location_name,
                       geo_validation_reason,
                       ai_overall_score, ai_complexity_level,
                       ai_claimed_level_match,
                       ai_joint_quality_score, ai_surface_finishing_score,
                       ai_structural_form_score, ai_tool_usage_score,
                       entry_trust_weight,
                       work_description, status)
                    VALUES (%s,%s,%s,%s,'image',
                            %s,'image/jpeg',
                            %s,%s,'pillow_exif',
                            TRUE,%s,%s,'within_radius',
                            %s,%s,TRUE,
                            %s,%s,%s,%s,
                            %s,%s,'verified')
                    ON CONFLICT (id) DO NOTHING
                """, (
                    uid(),
                    IDS[f"worker_{idx}"],
                    IDS[f"skill_{idx}"],
                    f"https://storage.googleapis.com/gramsphere-work/worker_{idx}_portfolio_{m_idx}.jpg",
                    round(random.uniform(1.2, 8.5), 2),
                    w_lat, w_lng,
                    dist,
                    f"Near {m_area}, Mysuru",
                    avg_ai,
                    level,
                    round(avg_ai / 10 * random.uniform(0.85, 1.0), 2),
                    round(avg_ai / 10 * random.uniform(0.85, 1.0), 2),
                    round(avg_ai / 10 * random.uniform(0.85, 1.0), 2),
                    round(avg_ai / 10 * random.uniform(0.80, 1.0), 2),
                    round(0.3 + (avg_ai / 100) * 0.5 + 0.2, 3),
                    f"Work sample {m_idx + 1} — {skill} project in Mysuru"
                ))

        # ── skill_task_attempts + badges (employed workers only) ─────
        if idx <= 12 and level != "beginner":
            task_key_map = {
                ("carpenter",  "intermediate"): "task_carp_int",
                ("carpenter",  "advanced"):     "task_carp_adv",
                ("weaver",     "intermediate"): "task_weav_int",
                ("weaver",     "advanced"):     "task_weav_int",
                ("weaver",     "master"):       "task_weav_int",
                ("potter",     "intermediate"): "task_pott_int",
                ("potter",     "advanced"):     "task_pott_int",
                ("cobbler",    "intermediate"): "task_cobb_int",
            }
            task_key = task_key_map.get((skill, level), f"task_{skill[:4]}_beg")

            if task_key in IDS:
                cur.execute("""
                    INSERT INTO skill_task_attempts
                      (id, user_id, skill_task_id, user_skill_id,
                       video_url, video_file_size_mb,
                       exif_latitude, exif_longitude, geo_verified, geo_distance_km,
                       ai_overall_score, ai_passed, ai_feedback,
                       ai_complexity_detected, tokens_awarded,
                       status, attempt_number)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,TRUE,%s,
                            %s,TRUE,%s,%s,%s,'passed',1)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    IDS[f"attempt_{idx}"],
                    IDS[f"worker_{idx}"],
                    IDS[task_key],
                    IDS[f"skill_{idx}"],
                    f"https://storage.googleapis.com/gramsphere-videos/worker_{idx}_task.mp4",
                    round(random.uniform(15, 80), 1),
                    w_lat if level != "beginner" else u_lat,
                    w_lng if level != "beginner" else u_lng,
                    round(dist if level != "beginner" else 0.5, 1),
                    avg_ai,
                    f"Work quality matches {level} level. Technique is solid. "
                    f"Continue practising for next tier.",
                    level,
                    skill_tokens
                ))

                # badge for this attempt
                cur.execute("""
                    INSERT INTO skill_badges
                      (id, user_id, skill_task_attempt_id, user_skill_id,
                       badge_name, skill_type, difficulty_level,
                       badge_code, is_valid)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,TRUE)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    IDS[f"badge_{idx}"],
                    IDS[f"worker_{idx}"],
                    IDS[f"attempt_{idx}"],
                    IDS[f"skill_{idx}"],
                    f"{level.title()} {skill.title()}",
                    skill, level,
                    f"BADGE-{skill[:4].upper()}-{level[:3].upper()}-"
                    f"{IDS[f'worker_{idx}'][:6].upper()}"
                ))

    # ── 5. EMPLOYMENT RECORDS + MERCHANT WORKFORCE ───────────────────
    print("   → employment_records + merchant_workforce")
    emp_idx = 1
    for w in WORKERS:
        idx, name, area, skill, level, merchant_key, days_emp = w
        if merchant_key is None:
            continue   # unemployed — no employment record

        merchant_id = IDS[merchant_key]
        start       = past_date(days_min=days_emp, days_max=days_emp + 5)
        is_current  = True
        rating      = round(random.uniform(3.6, 5.0), 2)

        cur.execute("""
            INSERT INTO employment_records
              (id, user_id, merchant_id, employer_type,
               job_title, skill_type,
               start_date, end_date, is_current, employment_type,
               location_city, location_district,
               work_description, client_rating, verified_by_merchant)
            VALUES (%s,%s,%s,'platform_merchant',
                    %s,%s,
                    %s,NULL,%s,'full_time',
                    'Mysuru','Mysuru',
                    %s,%s,TRUE)
            ON CONFLICT (id) DO NOTHING
        """, (
            IDS[f"emp_{emp_idx}"],
            IDS[f"worker_{idx}"],
            merchant_id,
            f"{level.title()} {skill.title()}",
            skill,
            start, is_current,
            f"Works as {level} {skill} at the establishment. "
            f"Responsible for client orders and quality finishing.",
            rating
        ))

        cur.execute("""
            INSERT INTO merchant_workforce
              (id, merchant_id, user_id, employment_record_id,
               status, hired_date, role_at_shop)
            VALUES (%s,%s,%s,%s,'active',%s,%s)
            ON CONFLICT (id) DO NOTHING
        """, (
            IDS[f"workforce_{emp_idx}"],
            merchant_id,
            IDS[f"worker_{idx}"],
            IDS[f"emp_{emp_idx}"],
            start,
            f"{level.title()} {skill.title()}"
        ))

        emp_idx += 1

    conn.commit()
    print("✅  All data committed successfully.")
    print_summary(cur)
    cur.close()


def print_summary(cur):
    """Prints a summary table of what was seeded."""
    print("\n" + "─" * 56)
    print("  MYSURU SEED SUMMARY")
    print("─" * 56)

    checks = [
        ("SELECT COUNT(*) FROM users WHERE role='user'",          "  Workers (users)"),
        ("SELECT COUNT(*) FROM users WHERE role='merchant'",       "  Merchants"),
        ("SELECT COUNT(*) FROM users WHERE role='msme_official'",  "  MSME officials"),
        ("SELECT COUNT(*) FROM merchants",                         "  Merchant profiles"),
        ("SELECT COUNT(*) FROM merchant_images",                   "  Shop images"),
        ("SELECT COUNT(*) FROM user_skills",                       "  User skills"),
        ("SELECT COUNT(*) FROM skill_tasks",                       "  Skill tasks"),
        ("SELECT COUNT(*) FROM skill_task_attempts",               "  Task attempts"),
        ("SELECT COUNT(*) FROM skill_badges",                      "  Skill badges"),
        ("SELECT COUNT(*) FROM skill_media",                       "  Portfolio media"),
        ("SELECT COUNT(*) FROM employment_records",                "  Employment records"),
        ("SELECT COUNT(*) FROM merchant_workforce",                "  Workforce rows"),
        ("SELECT COUNT(*) FROM certificates",                      "  Certificates"),
    ]

    for sql, label in checks:
        cur.execute(sql)
        count = cur.fetchone()[0]
        print(f"  {label:<30} {count:>4}")

    print("─" * 56)

    # Graph edge preview
    print("\n  GRAPH EDGES (Merchant → Employees)")
    print("─" * 56)
    cur.execute("""
        SELECT
            m.shop_name,
            COUNT(mw.id)            AS active_employees,
            ROUND(m.shop_latitude::numeric, 4)  AS shop_lat,
            ROUND(m.shop_longitude::numeric, 4) AS shop_lng
        FROM merchants m
        LEFT JOIN merchant_workforce mw
            ON mw.merchant_id = m.id AND mw.status = 'active'
        GROUP BY m.shop_name, m.shop_latitude, m.shop_longitude
        ORDER BY active_employees DESC
    """)
    for row in cur.fetchall():
        shop, emps, lat, lng = row
        print(f"  {shop:<35} {emps} employees  ({lat}, {lng})")

    print("\n  UNEMPLOYED USERS (isolated graph nodes)")
    print("─" * 56)
    cur.execute("""
        SELECT u.full_name, u.current_city,
               ROUND(u.latitude::numeric,4),
               ROUND(u.longitude::numeric,4)
        FROM users u
        WHERE u.role = 'user'
          AND u.id NOT IN (SELECT user_id FROM merchant_workforce WHERE status='active')
    """)
    for row in cur.fetchall():
        name, city, lat, lng = row
        print(f"  {name:<25} {city}  ({lat}, {lng})")
    print("─" * 56 + "\n")


# ─────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\nConnecting to: {DATABASE_URL[:40]}...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        seed(conn)
        conn.close()
    except psycopg2.OperationalError as e:
        print(f"❌  Could not connect to database: {e}")
        print("    Check your DATABASE_URL in .env")
    except Exception as e:
        print(f"❌  Seeding failed: {e}")
        import traceback
        traceback.print_exc()