from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from lib.sql_connect import get_sql_session
from lib.geo_validator import (
    extract_gps_from_image,
    extract_gps_from_video,
    validate_location
)
from lib.gemini import call_gemini
from datetime import datetime
import uuid
import os
import tempfile
import json
import subprocess

router = APIRouter(prefix="/verify", tags=["Verification Pipeline"])

IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/heic", "image/webp"}
VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/3gpp"}

# Predefined skills per trade (sorted by difficulty)
TRADE_SKILLS = {
    "carpenter": [
        {"id": "carp_1", "title": "Sand and finish a rough plank", "difficulty": "beginner"},
        {"id": "carp_2", "title": "Basic joinery (Half-lap joint)", "difficulty": "beginner"},
        {"id": "carp_3", "title": "Cut and fit a butt joint", "difficulty": "intermediate"},
        {"id": "carp_4", "title": "Router edge profiling", "difficulty": "intermediate"},
        {"id": "carp_5", "title": "Hand-cut a mortise and tenon joint", "difficulty": "advanced"},
        {"id": "carp_6", "title": "Table leg turning (Lathe work)", "difficulty": "advanced"},
        {"id": "carp_7", "title": "Intricate wood carving (Floral motif)", "difficulty": "master"}
    ]
}

# ── 1. WORK EVIDENCE PIPELINE ────────────────────────────────────────

@router.post("/upload-work")
async def upload_work_evidence(
    user_id: str = Form(...),
    work_description: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_sql_session)
):
    """
    Pipeline 1: Validates if the uploaded image matches the user's registered job.
    """
    # 1. Get user's job and registered city
    user = db.execute(text("SELECT full_name, role, current_district, cert_tier FROM users WHERE id = :id"), {"id": user_id}).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's primary skill/trade
    skill_row = db.execute(text("SELECT skill_type, proficiency_level FROM user_skills WHERE user_id = :id AND is_primary_skill = TRUE"), {"id": user_id}).fetchone()
    trade = skill_row.skill_type.lower() if skill_row else "artisan"
    
    if trade != "carpenter":
        raise HTTPException(status_code=400, detail="Currently, the verification pipeline only supports the 'carpenter' trade.")
    
    # 2. File validation
    content_type = file.content_type or ""
    is_image = content_type in IMAGE_TYPES
    file_bytes = await file.read()
    
    # 3. Geo validation
    gps_coords = extract_gps_from_image(file_bytes) if is_image else None
    registered_city = user.current_district + ", Karnataka"
    geo_result = validate_location(gps_coords, registered_city)
    
    if gps_coords and not geo_result["valid"]:
        return {"success": False, "error": "Location mismatch", "details": geo_result}

    # 4. Gemini AI Assessment
    prompt = f"""
    You are a master carpenter. Analyze this image of woodworking.
    Does the content of the picture match the tools, materials, and output of a professional carpenter?
    Look for: wood textures, sawdust, joinery, woodworking tools (saws, chisels, planes), or finished furniture.
    
    Return ONLY JSON: 
    {{
      "match": "yes" | "no", 
      "confidence_score": 0-100, 
      "reason": "Explain why it matches or why it looks like a different trade/fake."
    }}
    """
    ai_result = await call_gemini(prompt, [file_bytes])
    
    # 5. Push to Database (skill_media)
    media_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO skill_media (id, user_id, file_url, file_type, geo_verified, geo_distance_km, ai_overall_score, work_description, status)
        VALUES (:id, :u_id, :url, 'image', :geo, :dist, :score, :desc, :status)
    """), {
        "id": media_id,
        "u_id": user_id,
        "url": f"https://storage.googleapis.com/gramsphere-work/{media_id}.jpg",
        "geo": geo_result["valid"],
        "dist": geo_result.get("distance_km"),
        "score": ai_result.get("confidence_score", 0),
        "desc": work_description,
        "status": "verified" if ai_result.get("match") == "yes" and ai_result.get("confidence_score", 0) > 70 else "pending"
    })
    db.commit()
    
    return {
        "success": True,
        "ai_match": ai_result.get("match"),
        "confidence_score": ai_result.get("confidence_score"),
        "geo_verified": geo_result["valid"],
        "media_id": media_id
    }

# ── 2. SKILL BADGE PIPELINE ──────────────────────────────────────────

@router.get("/skills/{trade}")
async def get_trade_skills(trade: str):
    """Returns predefined list of skills for a trade."""
    return TRADE_SKILLS.get(trade.lower(), [])

@router.post("/upload-skill-task")
async def upload_skill_task(
    user_id: str = Form(...),
    skill_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_sql_session)
):
    """
    Pipeline 2: Validates if the uploaded content matches a specific skill task.
    """
    # 1. Find skill definition
    skill_def = None
    for trade, skills in TRADE_SKILLS.items():
        for s in skills:
            if s["id"] == skill_id:
                skill_def = s
                break
    
    if not skill_def:
        raise HTTPException(status_code=404, detail="Skill definition not found")

    # 2. Fetch user and city
    user = db.execute(text("SELECT current_district FROM users WHERE id = :id"), {"id": user_id}).fetchone()
    registered_city = user.current_district + ", Karnataka"

    # 3. File and Geo validation
    file_bytes = await file.read()
    content_type = file.content_type or ""
    is_image = content_type in IMAGE_TYPES
    is_video = content_type in VIDEO_TYPES
    
    gps_coords = None
    if is_image:
        gps_coords = extract_gps_from_image(file_bytes)
    elif is_video:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(file_bytes)
            gps_coords = extract_gps_from_video(tmp.name)
        os.unlink(tmp.name)

    geo_result = validate_location(gps_coords, registered_city)
    if gps_coords and not geo_result["valid"]:
        return {"success": False, "error": "Location mismatch", "details": geo_result}

    # 4. Gemini AI Assessment
    prompt = f"""
    You are a technical woodworking instructor. Analyze this {'image' if is_image else 'video'} 
    to see if it shows the user correctly performing the following carpenter skill: '{skill_def['title']}'.
    
    Return ONLY JSON: 
    {{
      "match": "yes" | "no", 
      "confidence_score": 0-100, 
      "reason": "Detailed technical analysis of the technique or output shown. Be specific about why it passed or failed."
    }}
    """
    ai_result = await call_gemini(prompt, [file_bytes], mime_type=content_type)
    ai_passed = ai_result.get("match") == "yes" and ai_result.get("confidence_score", 0) > 75
    
    # 5. Record Attempt (Always store in DB)
    attempt_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO skill_task_attempts (
            id, user_id, skill_task_id, video_url, geo_verified, 
            geo_distance_km, ai_overall_score, ai_passed, ai_feedback, status
        )
        VALUES (:id, :u_id, :task_id, :url, :geo, :dist, :score, :passed, :feedback, :status)
    """), {
        "id": attempt_id,
        "u_id": user_id,
        "task_id": skill_id,
        "url": f"https://storage.googleapis.com/gramsphere-tasks/{attempt_id}{'.mp4' if is_video else '.jpg'}",
        "geo": geo_result["valid"],
        "dist": geo_result.get("distance_km"),
        "score": ai_result.get("confidence_score", 0),
        "passed": ai_passed,
        "feedback": ai_result.get("reason", "No reason provided by AI"),
        "status": "completed"
    })

    # 6. Award Badge and Tokens if successful
    if ai_passed:
        badge_id = str(uuid.uuid4())
        media_url = f"https://storage.googleapis.com/gramsphere-tasks/{attempt_id}{'.mp4' if is_video else '.jpg'}"
        ai_report = ai_result.get("reason", "No reason provided by AI")
        
        db.execute(text("""
            INSERT INTO skill_badges (id, user_id, skill_task_attempt_id, badge_name, skill_type, difficulty_level, video_url, verification_report, is_valid)
            VALUES (:id, :u_id, :a_id, :name, :type, :level, :v_url, :report, TRUE)
        """), {
            "id": badge_id,
            "u_id": user_id,
            "a_id": attempt_id,
            "name": skill_def["title"],
            "type": "carpenter",
            "level": skill_def["difficulty"],
            "v_url": media_url,
            "report": ai_report
        })
        
        token_gain = {"beginner": 10, "intermediate": 20, "advanced": 40, "master": 100}.get(skill_def["difficulty"], 5)
        db.execute(text("UPDATE users SET skill_tokens = skill_tokens + :gain WHERE id = :id"), {"gain": token_gain, "id": user_id})
    
    db.commit()
    
    return {
        "success": ai_passed,
        "ai_match": ai_result.get("match"),
        "confidence": ai_result.get("confidence_score"),
        "reason": ai_result.get("reason"),
        "badge_awarded": skill_def["title"] if ai_passed else None,
        "attempt_id": attempt_id
    }

# ── 3. PAST WORK EXPERIENCE API ──────────────────────────────────────

@router.get("/work-history/{user_id}")
async def get_work_history(user_id: str, db: Session = Depends(get_sql_session)):
    """Returns a list of past work experience and verified portfolio entries."""
    # Employment records
    jobs = db.execute(text("SELECT job_title, start_date, end_date, client_rating FROM employment_records WHERE user_id = :id"), {"id": user_id}).fetchall()
    
    # Verified work samples
    samples = db.execute(text("SELECT work_description, ai_overall_score, created_at FROM skill_media WHERE user_id = :id AND status = 'verified'"), {"id": user_id}).fetchall()
    
    return {
        "employment": [dict(j._mapping) for j in jobs],
        "portfolio": [dict(s._mapping) for s in samples]
    }

# ── 4. CONFIDENCE SCORE CALCULATOR ────────────────────────────────────

@router.get("/trust-score/{user_id}")
async def get_trust_score(user_id: str, db: Session = Depends(get_sql_session)):
    """
    Calculates a final confidence/trust score (0-100) based on:
    1. AI-verified work samples (40%)
    2. Earned skill badges (30%)
    3. Years of experience and ratings (30%)
    """
    # 1. Portfolio Score
    samples = db.execute(text("SELECT ai_overall_score FROM skill_media WHERE user_id = :id AND status = 'verified'"), {"id": user_id}).fetchall()
    portfolio_avg = sum([s.ai_overall_score for s in samples]) / len(samples) if samples else 0
    portfolio_component = (portfolio_avg / 100) * 40
    
    # 2. Badges Score
    badges = db.execute(text("SELECT COUNT(*) FROM skill_badges WHERE user_id = :id AND is_valid = TRUE"), {"id": user_id}).fetchone()[0]
    # Assume 10 badges = max score for this component
    badge_component = min((badges / 10) * 30, 30)
    
    # 3. Experience Score
    exp = db.execute(text("SELECT years_of_experience FROM user_skills WHERE user_id = :id AND is_primary_skill = TRUE"), {"id": user_id}).fetchone()
    years = exp.years_of_experience if exp else 0
    rating_row = db.execute(text("SELECT AVG(client_rating) FROM employment_records WHERE user_id = :id"), {"id": user_id}).fetchone()
    avg_rating = rating_row[0] or 0
    
    # Calculation: (Years/20 * 15) + (Rating/5 * 15)
    exp_component = min((years / 20) * 15, 15) + ((avg_rating / 5) * 15)
    
    final_score = portfolio_component + badge_component + exp_component
    
    # Update the database
    db.execute(text("UPDATE users SET trust_score = :score WHERE id = :id"), {"score": round(final_score, 1), "id": user_id})
    db.commit()
    
    return {
        "user_id": user_id,
        "final_trust_score": round(final_score, 1),
        "breakdown": {
            "portfolio_verified": round(portfolio_component, 1),
            "badges": round(badge_component, 1),
            "experience_and_rating": round(exp_component, 1)
        }
    }