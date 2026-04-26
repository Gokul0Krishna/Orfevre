from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from lib.sql_connect import engine
from typing import Optional
import jwt
import datetime
import uuid

JWT_SECRET = "gramsphere_super_secret_key_change_in_prod"

router = APIRouter()

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role:      Optional[str] = None
    trade:     Optional[str] = None
    district:  Optional[str] = None

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
        firebase_uid = idinfo['sub']

        # Check if user exists in SQL
        with engine.connect() as conn:
            user = conn.execute(text("SELECT id, full_name, email, role FROM users WHERE email = :email"), {"email": email}).fetchone()

            if not user:
                # Create new user
                user_id = str(uuid.uuid4())
                conn.execute(text("""
                    INSERT INTO users (id, firebase_uid, full_name, email, role, trust_score, skill_tokens, is_active)
                    VALUES (:id, :f_uid, :name, :email, NULL, 50, 0, TRUE)
                """), {
                    "id": user_id,
                    "f_uid": firebase_uid,
                    "name": name,
                    "email": email
                })
                conn.commit()
                user_role = None
            else:
                user_id = user.id
                user_role = user.role
                name = user.full_name

        # Create session JWT
        payload = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": user_role,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return {
            "success": True,
            "token": token,
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "picture": picture,
                "role": user_role
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

    with engine.connect() as conn:
        user = conn.execute(text("SELECT email, full_name FROM users WHERE id = :id"), {"id": user_id}).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        conn.execute(text("UPDATE users SET role = :role WHERE id = :id"), {"role": body.role, "id": user_id})
        conn.commit()
    
    # Generate new JWT with updated role
    payload = {
        "user_id": user_id,
        "email": user.email,
        "name": user.full_name,
        "role": body.role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "name": user.full_name,
            "email": user.email,
            "role": body.role
        }
    }


# -- GET /user/{user_id} --------------------------------------------------
@router.get("/user/{user_id}")
async def get_user(user_id: str):
    """Fetch a single user's profile from SQL."""
    with engine.connect() as conn:
        user = conn.execute(text("""
            SELECT u.*, s.skill_type as trade, s.proficiency_level 
            FROM users u
            LEFT JOIN user_skills s ON u.id = s.user_id AND s.is_primary_skill = TRUE
            WHERE u.id = :id
        """), {"id": user_id}).fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return dict(user._mapping)


# -- PUT /user/{user_id} --------------------------------------------------
@router.put("/user/{user_id}")
async def update_user(user_id: str, body: UserUpdateRequest):
    """Update editable fields on a user record."""
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Map frontend field names to SQL column names if different
    sql_updates = []
    params = {"id": user_id}
    for k, v in updates.items():
        col = k
        if k == "district": col = "current_district"
        sql_updates.append(f"{col} = :{k}")
        params[k] = v

    query = f"UPDATE users SET {', '.join(sql_updates)} WHERE id = :id"
    with engine.connect() as conn:
        conn.execute(text(query), params)
        conn.commit()
    
    return {"success": True, "updated": updates}
