from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from lib.firestore import db
from typing import Optional
import datetime

router = APIRouter()

class ApplyGigRequest(BaseModel):
    youth_uid: str

class AcceptApplicationRequest(BaseModel):
    merchant_uid: str

# -- POST /gigs/{gig_id}/apply ----------------------------------------------
@router.post("/gigs/{gig_id}/apply")
async def apply_to_gig(gig_id: str, body: ApplyGigRequest):
    """Youth applies to a gig."""
    gig_ref = db.collection("gigs").document(gig_id)
    gig_snap = gig_ref.get()
    
    if not gig_snap.exists:
        raise HTTPException(status_code=404, detail="Gig not found")
        
    gig_data = gig_snap.to_dict()
    if gig_data.get("status") != "open":
        raise HTTPException(status_code=400, detail="Gig is not open for applications")

    youth_ref = db.collection("users").document(body.youth_uid)
    if not youth_ref.get().exists:
        raise HTTPException(status_code=404, detail="Youth user not found")

    # Create application document
    app_data = {
        "gig_id": gig_id,
        "shop_id": gig_data.get("shop_id", ""),
        "merchant_uid": gig_data.get("merchant_uid", ""),
        "youth_uid": body.youth_uid,
        "status": "pending",
        "applied_at": datetime.datetime.utcnow().isoformat()
    }
    
    app_ref = db.collection("applications").document()
    app_ref.set(app_data)
    
    return {"success": True, "application_id": app_ref.id}


# -- GET /gigs/{gig_id}/applications ----------------------------------------
@router.get("/gigs/{gig_id}/applications")
async def get_gig_applications(gig_id: str):
    """Merchant views applications for a specific gig."""
    query = db.collection("applications").where("gig_id", "==", gig_id).stream()
    
    apps = []
    for doc in query:
        app = doc.to_dict()
        app["id"] = doc.id
        
        # Hydrate youth data
        youth_snap = db.collection("users").document(app["youth_uid"]).get()
        if youth_snap.exists:
            youth_data = youth_snap.to_dict()
            app["youth_name"] = youth_data.get("name", "Unknown")
            app["youth_trust_score"] = youth_data.get("trustScore", 50)
            
        apps.append(app)
        
    return {"applications": apps}


# -- POST /gigs/{gig_id}/applications/{app_id}/accept -----------------------
@router.post("/gigs/{gig_id}/applications/{app_id}/accept")
async def accept_application(gig_id: str, app_id: str, body: AcceptApplicationRequest):
    """Merchant accepts a youth's application."""
    app_ref = db.collection("applications").document(app_id)
    app_snap = app_ref.get()
    
    if not app_snap.exists:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app_data = app_snap.to_dict()
    
    if app_data.get("gig_id") != gig_id:
        raise HTTPException(status_code=400, detail="Application does not belong to this gig")
        
    if app_data.get("merchant_uid") != body.merchant_uid:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Update application status
    app_ref.update({
        "status": "accepted",
        "updated_at": datetime.datetime.utcnow().isoformat()
    })
    
    # Auto-cancel other pending applications by this youth
    youth_uid = app_data.get("youth_uid")
    pending_apps = db.collection("applications")\
        .where("youth_uid", "==", youth_uid)\
        .where("status", "==", "pending")\
        .stream()
        
    for p_app in pending_apps:
        if p_app.id != app_id:
            p_app.reference.update({"status": "auto_cancelled"})
            
    # Add to hired array in the gig
    gig_ref = db.collection("gigs").document(gig_id)
    gig_snap = gig_ref.get()
    if gig_snap.exists:
        hired = gig_snap.to_dict().get("hired", [])
        if youth_uid not in hired:
            hired.append(youth_uid)
            gig_ref.update({"hired": hired})

    return {"success": True}

# -- GET /applications/mine -------------------------------------------------
@router.get("/applications/mine")
async def my_applications(youth_uid: str):
    """Youth gets their applied gigs."""
    query = db.collection("applications").where("youth_uid", "==", youth_uid).stream()
    
    apps = []
    for doc in query:
        app = doc.to_dict()
        app["id"] = doc.id
        
        # Hydrate gig data
        gig_snap = db.collection("gigs").document(app["gig_id"]).get()
        if gig_snap.exists:
            app["gig"] = gig_snap.to_dict()
            
        apps.append(app)
        
    return {"applications": apps}
