from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.firestore import db
from lib.graph_engine import compute_trust_score
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests
import jwt
import datetime

CLIENT_ID = "1034819862300-t43c6ahbdrh628iigdh80po94vatmq0l.apps.googleusercontent.com"
JWT_SECRET = "gramsphere_super_secret_key_change_in_prod"

router = APIRouter()


class UserUpdateRequest(BaseModel):
    name:     Optional[str] = None
    role:     Optional[str] = None
    trade:    Optional[str] = None
    district: Optional[str] = None
    location: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    credential: str

class SetRoleRequest(BaseModel):
    role: str

# -- POST /auth/google ----------------------------------------------------
@router.post("/auth/google")
async def google_auth(body: GoogleAuthRequest):
    import httpx
    try:
        # Verify the access token with Google
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {body.credential}"}
            )
            if response.status_code != 200:
                raise ValueError("Invalid access token")
            idinfo = response.json()
        
        email = idinfo['email']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        google_id = idinfo['sub']

        # Check if user exists in Firestore
        users_ref = db.collection("users")
        # Note: In a real production app we'd query by google_id or email
        # For Firestore emulator/testing, let's fetch all and filter or use .where()
        query = users_ref.where("email", "==", email).stream()
        docs = list(query)

        if len(docs) == 0:
            # Create new user
            new_user = {
                "email": email,
                "name": name,
                "picture": picture,
                "google_id": google_id,
                "role": None,
                "trade": "",
                "district": "",
                "trustScore": 50,
                "skillTokens": 0
            }
            doc_ref = users_ref.document()
            doc_ref.set(new_user)
            user_id = doc_ref.id
            user_data = new_user
        else:
            user_id = docs[0].id
            user_data = docs[0].to_dict()

        # Create session JWT
        payload = {
            "user_id": user_id,
            "email": email,
            "name": user_data.get("name"),
            "role": user_data.get("role"),
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return {
            "success": True,
            "token": token,
            "user": {
                "id": user_id,
                "name": user_data.get("name"),
                "email": user_data.get("email"),
                "picture": user_data.get("picture"),
                "role": user_data.get("role")
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")


# -- POST /auth/set-role --------------------------------------------------
@router.post("/auth/set-role")
async def set_role(body: SetRoleRequest, user_id: str):
    """Set the role for a newly registered user."""
    if body.role not in ["youth", "merchant", "official"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    ref = db.collection("users").document(user_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="User not found")

    # Allowed overwriting role for testing purposes
    user_data = snap.to_dict()
    ref.update({"role": body.role})
    
    # Generate new JWT with updated role
    payload = {
        "user_id": user_id,
        "email": user_data.get("email"),
        "name": user_data.get("name"),
        "role": body.role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "role": body.role
        }
    }


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
