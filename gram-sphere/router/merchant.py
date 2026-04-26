from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.firestore import db
from typing import Optional
import datetime

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
    open_time: Optional[str] = "9:00 AM"
    close_time: Optional[str] = "6:00 PM"
    days_open: Optional[list] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    shop_image: Optional[str] = ""  # base64 data URL

# -- GET /merchant/shop -------------------------------------------------------
@router.get("/merchant/shop")
async def get_shop(merchant_uid: str):
    """Get merchant's shop profile."""
    shops = db.collection("shops").where("merchant_uid", "==", merchant_uid).stream()
    for doc in shops:
        data = doc.to_dict()
        data["id"] = doc.id
        return {"success": True, "shop": data}
    return {"success": True, "shop": None}


# -- POST /merchant/shop -------------------------------------------------------
@router.post("/merchant/shop")
async def save_shop(body: ShopRequest):
    """Create or update merchant's shop profile."""
    if body.business_type not in BUSINESS_TYPES:
        raise HTTPException(status_code=400, detail="Invalid business type")

    # Check if shop already exists
    shops = db.collection("shops").where("merchant_uid", "==", body.merchant_uid).stream()
    existing = [(doc.id, doc.to_dict()) for doc in shops]

    shop_data = {
        "merchant_uid": body.merchant_uid,
        "shop_name": body.shop_name,
        "business_type": body.business_type,
        "description": body.description,
        "district": body.district,
        "area": body.area,
        "phone": body.phone,
        "lat": body.lat,
        "lon": body.lon,
        "open_time": body.open_time,
        "close_time": body.close_time,
        "days_open": body.days_open,
        "shop_image": body.shop_image,
        "updated_at": datetime.datetime.utcnow().isoformat(),
    }

    if existing:
        doc_id = existing[0][0]
        db.collection("shops").document(doc_id).update(shop_data)
        # Also update user record
        db.collection("users").document(body.merchant_uid).update({
            "shop_name": body.shop_name,
            "business_type": body.business_type,
            "district": body.district,
        })
        return {"success": True, "shop_id": doc_id, "action": "updated"}
    else:
        shop_data["created_at"] = datetime.datetime.utcnow().isoformat()
        ref = db.collection("shops").document()
        ref.set(shop_data)
        db.collection("users").document(body.merchant_uid).update({
            "shop_name": body.shop_name,
            "business_type": body.business_type,
            "district": body.district,
        })
        return {"success": True, "shop_id": ref.id, "action": "created"}


# -- GET /merchant/business-types --------------------------------------------
@router.get("/merchant/business-types")
async def get_business_types():
    return {"types": BUSINESS_TYPES}
