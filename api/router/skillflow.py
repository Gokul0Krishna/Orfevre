from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import text
from lib.sql_connect import engine
from lib.graph_engine import compute_trust_score, get_cluster_velocity
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter()

class GigCompleteRequest(BaseModel):
    gigId:    str
    youthId:  str
    vendorId: str

class SkillGapRequest(BaseModel):
    trade:         str
    currentSkills: list[str]
    district:      str
    goal:          str


# ── POST /complete-gig ───────────────────────────────────
@router.post("/complete-gig")
async def complete_gig(body: GigCompleteRequest):
    with engine.connect() as conn:
        # 1. Mark gig as completed
        conn.execute(text("UPDATE gigs SET status = 'completed' WHERE id = :id"), {"id": body.gigId})
        
        gig = conn.execute(text("SELECT tokens_reward FROM gigs WHERE id = :id"), {"id": body.gigId}).fetchone()
        tokens_reward = gig.tokens_reward if gig else 1

        # 2. Award skill tokens to youth
        conn.execute(text("UPDATE users SET skill_tokens = skill_tokens + :gain WHERE id = :id"), {"gain": tokens_reward, "id": body.youthId})
        
        # 3. Write gig edge to SQL (employment_records)
        record_id = str(uuid.uuid4())
        conn.execute(text("""
            INSERT INTO employment_records (id, user_id, job_title, start_date, end_date, status)
            VALUES (:id, :u_id, 'Gig Completion', :now, :now, 'completed')
        """), {"id": record_id, "u_id": body.youthId, "now": datetime.utcnow()})
        
        conn.commit()

    # Invalidate graph cache
    from lib.graph_engine import trust_cache, velocity_cache
    trust_cache.pop(body.youthId,  None)
    trust_cache.pop(body.vendorId, None)
    velocity_cache.clear()

    return {
        "success": True,
        "skillTokensEarned": tokens_reward,
        "youthTrustScore": compute_trust_score(body.youthId),
        "vendorTrustScore": compute_trust_score(body.vendorId)
    }


@router.post("/upload-proof")
async def upload_proof(
    userId: str = Form(...),
    skill: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Receives a photo/video proof of work. 
    Updates the user's skill tokens in SQL upon success.
    """
    with engine.connect() as conn:
        # 1. Update user tokens
        conn.execute(text("UPDATE users SET skill_tokens = skill_tokens + 1 WHERE id = :id"), {"id": userId})
        
        # 2. Add to skill_media
        media_id = str(uuid.uuid4())
        conn.execute(text("""
            INSERT INTO skill_media (id, user_id, work_description, status, created_at)
            VALUES (:id, :u_id, :desc, 'pending', :now)
        """), {
            "id": media_id,
            "u_id": userId,
            "desc": f"Proof for {skill}",
            "now": datetime.utcnow()
        })
        conn.commit()

    return {
        "success": True,
        "message": f"AI received your {skill} work!",
    }


# ── POST /skill-gap ──────────────────────────────────────
@router.post("/skill-gap")
async def skill_gap(body: SkillGapRequest):
    from lib.gemini import call_gemini

    prompt = f"""
    Analyze this artisan's skill gaps.
    Trade: {body.trade}
    District: {body.district}
    Skills: {', '.join(body.currentSkills)}
    
    Return JSON: {{ "skill_gaps": [], "recommended_gigs": [], "local_demand_context": "", "top_skill_to_learn": "" }}
    """
    result = await call_gemini(prompt)
    return result


# ── GET /match-schemes/{user_id} ─────────────────────────
@router.get("/match-schemes/{user_id}")
async def match_schemes(user_id: str):
    from lib.schemes import KARNATAKA_SCHEMES
    from lib.gemini import call_gemini

    with engine.connect() as conn:
        user = conn.execute(text("SELECT full_name, trust_score, skill_tokens FROM users WHERE id = :id"), {"id": user_id}).fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prompt = f"""
    Match this artisan to Karnataka government schemes.
    Name: {user.full_name}
    Trust Score: {user.trust_score}
    Tokens: {user.skill_tokens}

    Schemes: {KARNATAKA_SCHEMES}
    
    Return JSON: {{ "matches": [] }}
    """
    result = await call_gemini(prompt)
    return result