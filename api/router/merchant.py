from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from lib.sql_connect import engine
from typing import Optional
import datetime
import uuid

router = APIRouter()

BUSINESS_TYPES = [
    "Tailor", "Carpenter", "Electronics Repair", "Potter",
    "Weaver", "Cobbler", "Blacksmith", "Farmer",
    "Grocery / Kirana", "Food & Catering", "Photography",
    "Plumbing", "Painting", "Other"
]

class ShopRequest(BaseModel):
    merchant_uid: str
    shop_name: str
    business_type: str
    description: str
    district: str
    area: str
    phone: str
    lat: Optional[float] = None
    lon: Optional[float] = None

# -- GET /merchant/shop -------------------------------------------------------
@router.get("/merchant/shop")
async def get_shop(merchant_uid: str):
    """Get merchant's shop profile from SQL."""
    with engine.connect() as conn:
        shop = conn.execute(text("SELECT * FROM merchants WHERE user_id = :uid"), {"uid": merchant_uid}).fetchone()
        if shop:
            return {"success": True, "shop": dict(shop._mapping)}
    return {"success": True, "shop": None}


# -- POST /merchant/shop -------------------------------------------------------
@router.post("/merchant/shop")
async def save_shop(body: ShopRequest):
    """Create or update merchant's shop profile in SQL."""
    if body.business_type not in BUSINESS_TYPES:
        raise HTTPException(status_code=400, detail="Invalid business type")

    with engine.connect() as conn:
        existing = conn.execute(text("SELECT id FROM merchants WHERE user_id = :uid"), {"uid": body.merchant_uid}).fetchone()
        
        if existing:
            conn.execute(text("""
                UPDATE merchants 
                SET shop_name = :name, business_type = :type, shop_address_line = :desc, shop_district = :dist, shop_latitude = :lat, shop_longitude = :lon
                WHERE user_id = :uid
            """), {
                "name": body.shop_name,
                "type": body.business_type,
                "desc": body.description,
                "dist": body.district,
                "lat": body.lat,
                "lon": body.lon,
                "uid": body.merchant_uid
            })
            action = "updated"
            shop_id = existing.id
        else:
            shop_id = str(uuid.uuid4())
            conn.execute(text("""
                INSERT INTO merchants (id, user_id, shop_name, business_type, shop_address_line, shop_district, shop_latitude, shop_longitude)
                VALUES (:id, :uid, :name, :type, :desc, :dist, :lat, :lon)
            """), {
                "id": shop_id,
                "uid": body.merchant_uid,
                "name": body.shop_name,
                "type": body.business_type,
                "desc": body.description,
                "dist": body.district,
                "lat": body.lat,
                "lon": body.lon
            })
            action = "created"
        
        conn.commit()

    return {"success": True, "shop_id": shop_id, "action": action}


# -- GET /merchant/business-types --------------------------------------------
@router.get("/merchant/business-types")
async def get_business_types():
    return {"types": BUSINESS_TYPES}
