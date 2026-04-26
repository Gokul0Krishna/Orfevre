from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import text
from lib.sql_connect import engine
from typing import Optional
import datetime
import uuid

router = APIRouter()

class ApplyGigRequest(BaseModel):
    youth_uid: str

class AcceptApplicationRequest(BaseModel):
    merchant_uid: str

# -- POST /gigs/{gig_id}/apply ----------------------------------------------
@router.post("/gigs/{gig_id}/apply")
async def apply_to_gig(gig_id: str, body: ApplyGigRequest):
    """Youth applies to a gig."""
    with engine.connect() as conn:
        gig = conn.execute(text("SELECT status, merchant_uid, id FROM gigs WHERE id = :id"), {"id": gig_id}).fetchone()
        if not gig:
            raise HTTPException(status_code=404, detail="Gig not found")
        
        if gig.status != "open":
            raise HTTPException(status_code=400, detail="Gig is not open for applications")

        # Check if user exists
        user = conn.execute(text("SELECT id FROM users WHERE id = :id"), {"id": body.youth_uid}).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Youth user not found")

        # Create application
        app_id = str(uuid.uuid4())
        conn.execute(text("""
            INSERT INTO applications (id, gig_id, merchant_uid, youth_uid, status)
            VALUES (:id, :gig_id, :m_uid, :y_uid, 'pending')
        """), {
            "id": app_id,
            "gig_id": gig_id,
            "m_uid": gig.merchant_uid,
            "y_uid": body.youth_uid
        })
        conn.commit()
    
    return {"success": True, "application_id": app_id}


# -- GET /gigs/{gig_id}/applications ----------------------------------------
@router.get("/gigs/{gig_id}/applications")
async def get_gig_applications(gig_id: str):
    """Merchant views applications for a specific gig."""
    with engine.connect() as conn:
        query = text("""
            SELECT a.*, u.full_name as youth_name, u.trust_score as youth_trust_score
            FROM applications a
            JOIN users u ON a.youth_uid = u.id
            WHERE a.gig_id = :gig_id
        """)
        results = conn.execute(query, {"gig_id": gig_id}).fetchall()
        
    return {"applications": [dict(r._mapping) for r in results]}


# -- POST /gigs/{gig_id}/applications/{app_id}/accept -----------------------
@router.post("/gigs/{gig_id}/applications/{app_id}/accept")
async def accept_application(gig_id: str, app_id: str, body: AcceptApplicationRequest):
    """Merchant accepts a youth's application."""
    with engine.connect() as conn:
        app = conn.execute(text("SELECT youth_uid, merchant_uid FROM applications WHERE id = :id"), {"id": app_id}).fetchone()
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
            
        if app.merchant_uid != body.merchant_uid:
            raise HTTPException(status_code=403, detail="Unauthorized")

        # Update application status
        conn.execute(text("""
            UPDATE applications 
            SET status = 'accepted', updated_at = :now 
            WHERE id = :id
        """), {"id": app_id, "now": datetime.datetime.utcnow()})
        
        # Auto-cancel other pending applications by this youth
        conn.execute(text("""
            UPDATE applications 
            SET status = 'auto_cancelled' 
            WHERE youth_uid = :y_uid AND status = 'pending' AND id != :id
        """), {"y_uid": app.youth_uid, "id": app_id})
        
        # Add to merchant_workforce (Hired)
        workforce_id = str(uuid.uuid4())
        conn.execute(text("""
            INSERT INTO merchant_workforce (id, merchant_id, user_id, status, hired_date)
            SELECT :wf_id, m.id, :u_id, 'active', :now
            FROM merchants m WHERE m.user_id = :m_uid
        """), {
            "wf_id": workforce_id,
            "u_id": app.youth_uid,
            "m_uid": body.merchant_uid,
            "now": datetime.datetime.utcnow()
        })
        
        conn.commit()

    return {"success": True}

# -- GET /applications/mine -------------------------------------------------
@router.get("/applications/mine")
async def my_applications(youth_uid: str):
    """Youth gets their applied gigs."""
    with engine.connect() as conn:
        query = text("""
            SELECT a.*, g.title, g.tokens_reward as "tokensReward", g.status as gig_status
            FROM applications a
            JOIN gigs g ON a.gig_id = g.id
            WHERE a.youth_uid = :y_uid
        """)
        results = conn.execute(query, {"y_uid": youth_uid}).fetchall()
        
    apps = []
    for r in results:
        row = dict(r._mapping)
        # Structure it to match what the frontend expects
        row["gig"] = {
            "title": row.get("title"),
            "tokensReward": row.get("tokensReward"),
            "status": row.get("gig_status")
        }
        apps.append(row)
        
    return {"applications": apps}

# -- GET /gigs --------------------------------------------------------------
@router.get("/gigs")
async def get_gigs():
    """Fetch all open gigs from SQL."""
    with engine.connect() as conn:
        results = conn.execute(text("SELECT * FROM gigs WHERE status = 'open' ORDER BY created_at DESC")).fetchall()
    return {"gigs": [dict(r._mapping) for r in results]}
