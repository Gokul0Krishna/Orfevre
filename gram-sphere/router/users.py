from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.firestore import db
from lib.graph_engine import compute_trust_score
from typing import Optional

router = APIRouter()


class UserUpdateRequest(BaseModel):
    name:     Optional[str] = None
    role:     Optional[str] = None
    trade:    Optional[str] = None
    district: Optional[str] = None
    location: Optional[str] = None


# -- GET /user/{user_id} --------------------------------------------------
@router.get("/user/{user_id}")
async def get_user(user_id: str):
    """Fetch a single user's profile from Firestore."""
    snap = db.collection("users").document(user_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="User not found")

    user = snap.to_dict()
    user["id"] = snap.id

    # Attach live trust score
    user["trustScore"] = compute_trust_score(user_id)

    return user


# -- PUT /user/{user_id} --------------------------------------------------
@router.put("/user/{user_id}")
async def update_user(user_id: str, body: UserUpdateRequest):
    """Update editable fields on a user document."""
    ref = db.collection("users").document(user_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")

    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    ref.update(updates)
    return {"success": True, "updated": updates}


# -- GET /gigs -------------------------------------------------------------
@router.get("/gigs")
async def list_gigs(category: Optional[str] = None):
    """Return gigs from Firestore, optionally filtered by category (trade)."""
    query = db.collection("gigs")
    
    if category:
        # Simple case-insensitive match (start-of-string)
        # Note: Firestore doesn't do case-insensitive search easily, 
        # so we fetch and filter if needed or assume exact match for now.
        docs = query.where("title", "==", category).stream()
    else:
        docs = query.stream()

    gigs = []
    for d in docs:
        gig = d.to_dict()
        gig["id"] = d.id
        gigs.append(gig)
    return {"gigs": gigs}
