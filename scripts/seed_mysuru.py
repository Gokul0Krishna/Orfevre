import os
import sys
import uuid
import random
from datetime import date, datetime, timedelta
from sqlalchemy import text
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.sql_connect import engine

load_dotenv()

# ─────────────────────────────────────────────────────────────────────
# MYSURU REAL COORDINATES
# ─────────────────────────────────────────────────────────────────────
MYSURU_AREAS = {
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
    delta = metres / 111000
    return (
        round(lat + random.uniform(-delta, delta), 7),
        round(lng + random.uniform(-delta, delta), 7),
    )

def uid():
    return str(uuid.uuid4())

def fake_firebase_uid():
    chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "".join(random.choices(chars, k=28))

def past_date(days_min=30, days_max=730):
    return date.today() - timedelta(days=random.randint(days_min, days_max))

# ─────────────────────────────────────────────────────────────────────
# SCHEMA INITIALIZATION
# ─────────────────────────────────────────────────────────────────────
def init_db():
    print("Initializing SQL Schema (Clean Slate)...")
    with engine.connect() as conn:
        # Drop tables in reverse order of dependencies
        conn.execute(text("""
            DROP TABLE IF EXISTS merchant_images CASCADE;
            DROP TABLE IF EXISTS skill_badges CASCADE;
            DROP TABLE IF EXISTS skill_task_attempts CASCADE;
            DROP TABLE IF EXISTS skill_media CASCADE;
            DROP TABLE IF EXISTS merchant_workforce CASCADE;
            DROP TABLE IF EXISTS employment_records CASCADE;
            DROP TABLE IF EXISTS certificates CASCADE;
            DROP TABLE IF EXISTS user_skills CASCADE;
            DROP TABLE IF EXISTS skill_tasks CASCADE;
            DROP TABLE IF EXISTS msme_officials CASCADE;
            DROP TABLE IF EXISTS merchants CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                firebase_uid VARCHAR(128),
                full_name VARCHAR(100),
                email VARCHAR(100),
                phone_number VARCHAR(20),
                role VARCHAR(20),
                current_city VARCHAR(50),
                current_district VARCHAR(50),
                current_state VARCHAR(50),
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                trust_score DOUBLE PRECISION,
                skill_tokens INTEGER DEFAULT 0,
                cert_tier VARCHAR(20),
                cert_trust_weight DOUBLE PRECISION,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS msme_officials (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) REFERENCES users(id),
                department VARCHAR(100),
                designation VARCHAR(100),
                jurisdiction_district VARCHAR(50),
                employee_id VARCHAR(50),
                is_verified BOOLEAN DEFAULT FALSE
            );

            CREATE TABLE IF NOT EXISTS merchants (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) REFERENCES users(id),
                shop_name VARCHAR(100),
                business_type VARCHAR(50),
                shop_address_line TEXT,
                shop_city VARCHAR(50),
                shop_district VARCHAR(50),
                shop_state VARCHAR(50),
                shop_pincode VARCHAR(10),
                shop_latitude DOUBLE PRECISION,
                shop_longitude DOUBLE PRECISION,
                is_verified BOOLEAN DEFAULT FALSE,
                verification_status VARCHAR(20) DEFAULT 'pending'
            );

            CREATE TABLE IF NOT EXISTS skill_tasks (
                id VARCHAR(50) PRIMARY KEY,
                skill_type VARCHAR(50),
                difficulty_level VARCHAR(20),
                task_title VARCHAR(100),
                task_description TEXT,
                tokens_reward INTEGER,
                estimated_minutes INTEGER,
                is_active BOOLEAN DEFAULT TRUE
            );

            CREATE TABLE IF NOT EXISTS user_skills (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) REFERENCES users(id),
                skill_type VARCHAR(50),
                proficiency_level VARCHAR(20),
                years_of_experience INTEGER,
                is_primary_skill BOOLEAN DEFAULT FALSE,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS certificates (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) REFERENCES users(id),
                user_skill_id VARCHAR(50) REFERENCES user_skills(id),
                certificate_code VARCHAR(50),
                skill_type VARCHAR(50),
                tier VARCHAR(20),
                tier_description TEXT,
                verified_media_count INTEGER DEFAULT 0,
                geo_verified_media_count INTEGER DEFAULT 0,
                badges_earned_count INTEGER DEFAULT 0,
                avg_ai_score DOUBLE PRECISION,
                avg_gig_rating DOUBLE PRECISION,
                cert_trust_weight DOUBLE PRECISION,
                verify_url TEXT,
                issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS employment_records (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) REFERENCES users(id),
                merchant_id VARCHAR(50) REFERENCES merchants(id),
                employer_type VARCHAR(50),
                job_title VARCHAR(100),
                skill_type VARCHAR(50),
                start_date DATE,
                end_date DATE,
                is_current BOOLEAN DEFAULT TRUE,
                employment_type VARCHAR(20),
                location_city VARCHAR(50),
                location_district VARCHAR(50),
                work_description TEXT,
                client_rating DOUBLE PRECISION,
                verified_by_merchant BOOLEAN DEFAULT FALSE
            );

            CREATE TABLE IF NOT EXISTS merchant_workforce (
                id VARCHAR(50) PRIMARY KEY,
                merchant_id VARCHAR(50) REFERENCES merchants(id),
                user_id VARCHAR(50) REFERENCES users(id),
                employment_record_id VARCHAR(50) REFERENCES employment_records(id),
                status VARCHAR(20) DEFAULT 'active',
                hired_date DATE,
                role_at_shop VARCHAR(100)
            );

            CREATE TABLE IF NOT EXISTS skill_media (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) REFERENCES users(id),
                user_skill_id VARCHAR(50) REFERENCES user_skills(id),
                file_url TEXT,
                file_type VARCHAR(20),
                file_size_mb DOUBLE PRECISION,
                mime_type VARCHAR(50),
                exif_latitude DOUBLE PRECISION,
                exif_longitude DOUBLE PRECISION,
                exif_source VARCHAR(50),
                geo_verified BOOLEAN DEFAULT FALSE,
                geo_distance_km DOUBLE PRECISION,
                geo_work_location_name TEXT,
                geo_validation_reason TEXT,
                ai_overall_score DOUBLE PRECISION,
                ai_complexity_level VARCHAR(20),
                ai_claimed_level_match BOOLEAN,
                ai_joint_quality_score DOUBLE PRECISION,
                ai_surface_finishing_score DOUBLE PRECISION,
                ai_structural_form_score DOUBLE PRECISION,
                ai_tool_usage_score DOUBLE PRECISION,
                entry_trust_weight DOUBLE PRECISION,
                work_description TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS skill_task_attempts (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) REFERENCES users(id),
                skill_task_id VARCHAR(50) REFERENCES skill_tasks(id),
                user_skill_id VARCHAR(50) REFERENCES user_skills(id),
                video_url TEXT,
                video_file_size_mb DOUBLE PRECISION,
                exif_latitude DOUBLE PRECISION,
                exif_longitude DOUBLE PRECISION,
                geo_verified BOOLEAN DEFAULT FALSE,
                geo_distance_km DOUBLE PRECISION,
                ai_overall_score DOUBLE PRECISION,
                ai_passed BOOLEAN,
                ai_feedback TEXT,
                ai_complexity_detected VARCHAR(20),
                tokens_awarded INTEGER,
                status VARCHAR(20) DEFAULT 'pending',
                attempt_number INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS skill_badges (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) REFERENCES users(id),
                skill_task_attempt_id VARCHAR(50) REFERENCES skill_task_attempts(id),
                user_skill_id VARCHAR(50) REFERENCES user_skills(id),
                badge_name VARCHAR(100),
                skill_type VARCHAR(50),
                difficulty_level VARCHAR(20),
                badge_code VARCHAR(50),
                video_url TEXT,
                verification_report TEXT,
                is_valid BOOLEAN DEFAULT TRUE,
                issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS merchant_images (
                id VARCHAR(50) PRIMARY KEY,
                merchant_id VARCHAR(50) REFERENCES merchants(id),
                image_url TEXT,
                image_type VARCHAR(50),
                caption TEXT,
                is_primary BOOLEAN DEFAULT FALSE,
                display_order INTEGER
            );
        """))
        conn.commit()
    print("Schema initialized.")

# ─────────────────────────────────────────────────────────────────────
# SEEDING LOGIC (Using User's Detailed Data)
# ─────────────────────────────────────────────────────────────────────

IDS = {
    "official_user":    uid(),
    "official_profile": uid(),
    "merchant_user_1":    uid(), "merchant_1": uid(),
    "merchant_user_2":    uid(), "merchant_2": uid(),
    "merchant_user_3":    uid(), "merchant_3": uid(),
    "merchant_user_4":    uid(), "merchant_4": uid(),
    **{f"worker_{i}": uid() for i in range(1, 17)},
    **{f"skill_{i}": uid() for i in range(1, 17)},
    **{f"cert_{i}": uid() for i in range(1, 17)},
    **{f"emp_{i}": uid() for i in range(1, 13)},
    **{f"workforce_{i}": uid() for i in range(1, 13)},
    "task_carp_beg": uid(), "task_carp_int": uid(), "task_carp_adv": uid(),
    "task_weav_beg": uid(), "task_weav_int": uid(),
    "task_pott_beg": uid(), "task_pott_int": uid(),
    "task_cobb_beg": uid(), "task_cobb_int": uid(),
    "task_arti_beg": uid(),
    **{f"badge_{i}": uid() for i in range(1, 13)},
    **{f"attempt_{i}": uid() for i in range(1, 13)},
}

WORKERS = [
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
    (13, "Venkatesha P",         "Rajivnagar",         "carpenter",  "beginner",     None,            0),
    (14, "Girija Bai",           "Kesare",             "artisan",    "intermediate", None,            0),
    (15, "Hanumanthu D",         "Udayagiri",          "weaver",     "beginner",     None,            0),
    (16, "Thimmaiah G",          "Siddalingapura",     "cobbler",    "beginner",     None,            0),
]

MERCHANT_DEFS = [
    {"key": "merchant_1", "user_key": "merchant_user_1", "name": "Ravi Shankar", "email": "ravi.shankar@gramsphere.in", "phone": "9845012301", "shop_name": "Ravi's Carpentry Works", "biz_type": "Carpentry Workshop", "area": "Kuvempunagar", "address": "14, 5th Cross, Kuvempunagar, Mysuru", "pincode": "570023"},
    {"key": "merchant_2", "user_key": "merchant_user_2", "name": "Lakshmi Venkatesh", "email": "lakshmi.v@gramsphere.in", "phone": "9741023456", "shop_name": "Lakshmi Silk Weaves", "biz_type": "Weaving Unit", "area": "Mandi Mohalla", "address": "8, Mandi Mohalla, Near Clock Tower, Mysuru", "pincode": "570021"},
    {"key": "merchant_3", "user_key": "merchant_user_3", "name": "Suresh Babu", "email": "suresh.pottery@gramsphere.in", "phone": "9632145678", "shop_name": "Suresh Traditional Pottery", "biz_type": "Pottery Studio", "area": "Bamboo Bazaar", "address": "22, Pottery Lane, Bamboo Bazaar, Mysuru", "pincode": "570001"},
    {"key": "merchant_4", "user_key": "merchant_user_4", "name": "Govind Das", "email": "govind.cobbler@gramsphere.in", "phone": "8971234560", "shop_name": "Govind Cobbler Works", "biz_type": "Cobbler Workshop", "area": "Gokulam", "address": "3, Gokulam 3rd Stage, Mysuru", "pincode": "570002"},
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

def seed_mysuru():
    print("[SEEDING] Seeding GramSphere Mysuru data...")
    with engine.connect() as conn:
        # Clear data
        conn.execute(text("TRUNCATE merchant_images, skill_badges, skill_task_attempts, skill_media, merchant_workforce, employment_records, certificates, user_skills, skill_tasks, msme_officials, merchants, users CASCADE;"))
        
        # 1. Skill Tasks
        for t in TASK_DEFS:
            key, skill, level, title, desc, tokens, mins = t
            conn.execute(text("""
                INSERT INTO skill_tasks (id, skill_type, difficulty_level, task_title, task_description, tokens_reward, estimated_minutes, is_active)
                VALUES (:id, :skill, :level, :title, :desc, :tokens, :mins, TRUE)
            """), {"id": IDS[key], "skill": skill, "level": level, "title": title, "desc": desc, "tokens": tokens, "mins": mins})

        # 2. MSME Official
        off_lat, off_lng = MYSURU_AREAS["N R Mohalla"]
        conn.execute(text("""
            INSERT INTO users (id, firebase_uid, full_name, email, phone_number, role, current_city, current_district, current_state, latitude, longitude, trust_score, is_active)
            VALUES (:id, :f_uid, :name, :email, :phone, 'msme_official', 'Mysuru', 'Mysuru', 'Karnataka', :lat, :lng, 85.0, TRUE)
        """), {"id": IDS["official_user"], "f_uid": fake_firebase_uid(), "name": "Chandrashekar Murthy", "email": "chandrashekar.msme@karnataka.gov.in", "phone": "9480012345", "lat": off_lat, "lng": off_lng})
        
        conn.execute(text("""
            INSERT INTO msme_officials (id, user_id, department, designation, jurisdiction_district, employee_id, is_verified)
            VALUES (:id, :u_id, 'MSME Department Karnataka', 'District Industries Officer', 'Mysuru', 'KA-DIO-MYS-001', TRUE)
        """), {"id": IDS["official_profile"], "u_id": IDS["official_user"]})

        # 3. Merchants
        for m in MERCHANT_DEFS:
            lat, lng = MYSURU_AREAS[m["area"]]
            shop_lat, shop_lng = jitter(lat, lng, metres=50)
            conn.execute(text("""
                INSERT INTO users (id, firebase_uid, full_name, email, phone_number, role, current_city, current_district, current_state, latitude, longitude, trust_score, is_active)
                VALUES (:id, :f_uid, :name, :email, :phone, 'merchant', 'Mysuru', 'Mysuru', 'Karnataka', :lat, :lng, 70.0, TRUE)
            """), {"id": IDS[m["user_key"]], "f_uid": fake_firebase_uid(), "name": m["name"], "email": m["email"], "phone": m["phone"], "lat": lat, "lng": lng})
            
            conn.execute(text("""
                INSERT INTO merchants (id, user_id, shop_name, business_type, shop_address_line, shop_city, shop_district, shop_state, shop_pincode, shop_latitude, shop_longitude, is_verified, verification_status)
                VALUES (:id, :u_id, :shop_name, :biz_type, :address, 'Mysuru', 'Mysuru', 'Karnataka', :pincode, :lat, :lng, TRUE, 'verified')
            """), {"id": IDS[m["key"]], "u_id": IDS[m["user_key"]], "shop_name": m["shop_name"], "biz_type": m["biz_type"], "address": m["address"], "pincode": m["pincode"], "lat": shop_lat, "lng": shop_lng})

            image_types = ["shop_front", "interior", "products"]
            for idx, img_type in enumerate(image_types):
                conn.execute(text("""
                    INSERT INTO merchant_images (id, merchant_id, image_url, image_type, caption, is_primary, display_order)
                    VALUES (:id, :m_id, :url, :type, :caption, :is_primary, :order)
                """), {"id": uid(), "m_id": IDS[m["key"]], "url": f"https://picsum.photos/seed/{m['key']}_{idx}/800/600", "type": img_type, "caption": f"{img_type} of {m['shop_name']}", "is_primary": idx == 0, "order": idx})

        # 4. Workers
        for w in WORKERS:
            idx, name, area, skill, level, merchant_key, days_emp = w
            area_lat, area_lng = MYSURU_AREAS[area]
            u_lat, u_lng = jitter(area_lat, area_lng, metres=150)
            level_boost = {"beginner":0,"intermediate":15,"advanced":30,"master":45}[level]
            emp_boost = min(days_emp / 30, 20)
            trust_score = round(min(25 + level_boost + emp_boost, 95), 1)
            skill_tokens = {"beginner":0,"intermediate":2,"advanced":4,"master":6}[level]
            cert_tier = {"beginner":"bronze","intermediate":"silver","advanced":"gold","master":"master"}[level]
            cert_weight = {"bronze":0.20,"silver":0.50,"gold":0.80,"master":1.00}[cert_tier]
            
            conn.execute(text("""
                INSERT INTO users (id, firebase_uid, full_name, email, phone_number, role, current_city, current_district, current_state, latitude, longitude, trust_score, skill_tokens, cert_tier, cert_trust_weight, is_active)
                VALUES (:id, :f_uid, :name, :email, :phone, 'user', 'Mysuru', 'Mysuru', 'Karnataka', :lat, :lng, :trust, :tokens, :tier, :weight, TRUE)
            """), {"id": IDS[f"worker_{idx}"], "f_uid": fake_firebase_uid(), "name": name, "email": f"{name.lower().replace(' ','.')}@example.com", "phone": f"9{random.randint(100000000, 999999999)}", "lat": u_lat, "lng": u_lng, "trust": trust_score, "tokens": skill_tokens, "tier": cert_tier, "weight": cert_weight})

            conn.execute(text("""
                INSERT INTO user_skills (id, user_id, skill_type, proficiency_level, years_of_experience, is_primary_skill)
                VALUES (:id, :u_id, :skill, :level, :exp, TRUE)
            """), {"id": IDS[f"skill_{idx}"], "u_id": IDS[f"worker_{idx}"], "skill": skill, "level": level, "exp": {"beginner":1,"intermediate":3,"advanced":6,"master":10}[level]})

            avg_ai = round(random.uniform(60, 95), 1)
            conn.execute(text("""
                INSERT INTO certificates (id, user_id, user_skill_id, certificate_code, skill_type, tier, tier_description, verified_media_count, geo_verified_media_count, badges_earned_count, avg_ai_score, avg_gig_rating, cert_trust_weight, verify_url)
                VALUES (:id, :u_id, :s_id, :code, :skill, :tier, :desc, :media, :geo, :badges, :ai, :rating, :weight, :url)
            """), {"id": IDS[f"cert_{idx}"], "u_id": IDS[f"worker_{idx}"], "s_id": IDS[f"skill_{idx}"], "code": f"GS-{skill[:4].upper()}-{idx:03}", "skill": skill, "tier": cert_tier, "desc": f"{cert_tier.title()} Certificate", "media": random.randint(1, 5), "geo": random.randint(1, 5), "badges": skill_tokens, "ai": avg_ai, "rating": round(random.uniform(4.0, 5.0), 1), "weight": cert_weight, "url": f"https://gramsphere.ai/v/{idx}"})

            if merchant_key:
                m_id = IDS[merchant_key]
                start = date.today() - timedelta(days=days_emp)
                conn.execute(text("""
                    INSERT INTO employment_records (id, user_id, merchant_id, employer_type, job_title, skill_type, start_date, is_current, employment_type, location_city, location_district, work_description, client_rating, verified_by_merchant)
                    VALUES (:id, :u_id, :m_id, 'merchant', :title, :skill, :start, TRUE, 'full_time', 'Mysuru', 'Mysuru', 'Employed here', :rating, TRUE)
                """), {"id": IDS[f"emp_{idx}"], "u_id": IDS[f"worker_{idx}"], "m_id": m_id, "title": f"{level.title()} {skill.title()}", "skill": skill, "start": start, "rating": round(random.uniform(4.0, 5.0), 1)})
                
                conn.execute(text("""
                    INSERT INTO merchant_workforce (id, merchant_id, user_id, employment_record_id, status, hired_date, role_at_shop)
                    VALUES (:id, :m_id, :u_id, :e_id, 'active', :start, :role)
                """), {"id": IDS[f"workforce_{idx}"], "m_id": m_id, "u_id": IDS[f"worker_{idx}"], "e_id": IDS[f"emp_{idx}"], "start": start, "role": f"{level.title()} {skill.title()}"})

        conn.commit()
    print("SUCCESS: Mysuru data seeded successfully.")

if __name__ == "__main__":
    init_db()
    seed_mysuru()
