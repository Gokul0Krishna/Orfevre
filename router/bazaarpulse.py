from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.firestore import db
from lib.gemini import call_gemini
from datetime import datetime
import uuid

router = APIRouter()


class InventoryItem(BaseModel):
    name:           str
    stock:          float
    avgWeeklySales: float


class InventoryUpdateRequest(BaseModel):
    vendorId: str
    products: list[InventoryItem]


class ListingRequest(BaseModel):
    vendorId:           str
    productDescription: str
    trade:              str
    district:           str


class SaleRequest(BaseModel):
    vendorId:  str
    buyerId:   str
    amount:    float
    productId: str


class DemandForecastRequest(BaseModel):
    trade:    str
    district: str
    month:    str
    products: list[InventoryItem]


# ── POST /inventory/update ───────────────────────────────
@router.post("/inventory/update")
async def update_inventory(body: InventoryUpdateRequest):
    overstocked = []
    coupons     = []

    for product in body.products:
        db.collection("inventory").add({
            "vendorId":       body.vendorId,
            "productName":    product.name,
            "stock":          product.stock,
            "avgWeeklySales": product.avgWeeklySales,
            "updatedAt":      datetime.utcnow()
        })

        # Overstock detection
        if product.stock > product.avgWeeklySales * 1.5:
            overstocked.append(product.name)
            coupons.append({
                "product":   product.name,
                "discount":  "15%",
                "validity":  "48 hours",
                "code":      f"OVER-{product.name[:4].upper()}-{uuid.uuid4().hex[:4].upper()}"
            })

    return {
        "success":     True,
        "overstocked": overstocked,
        "coupons":     coupons
    }


# ── POST /demand-forecast ────────────────────────────────
@router.post("/demand-forecast")
async def demand_forecast(body: DemandForecastRequest):
    products_str = "\n".join(
        f"- {p.name}: stock={p.stock}, avg weekly sales={p.avgWeeklySales}"
        for p in body.products
    )

    prompt = f"""
    You are a market intelligence analyst for rural Karnataka.
    Forecast demand changes for these products.

    Context:
    - Trade: {body.trade}
    - District: {body.district}
    - Month: {body.month}
    - Karnataka festivals to consider: Dasara (Oct), Ugadi (Mar/Apr),
      Sankranti (Jan), Deepavali (Oct/Nov), Hampi Utsava (Nov)

    Products:
    {products_str}

    Return ONLY valid JSON:
    {{
      "forecast": [
        {{
          "productName": "string",
          "expectedDemandChange": "string",
          "reasoning": "string",
          "recommendedAction": "string"
        }}
      ],
      "festivalAlert": "string or null"
    }}
    """
    result = await call_gemini(prompt)
    return result


# ── POST /generate-listing ───────────────────────────────
@router.post("/generate-listing")
async def generate_listing(body: ListingRequest):
    prompt = f"""
    Generate a warm, authentic marketplace listing for a local artisan's product
    in three languages: Kannada, Hindi, and English.
    The listing should feel community-appropriate, not corporate.

    Product description: {body.productDescription}
    Trade: {body.trade}
    District: {body.district}

    Return ONLY valid JSON:
    {{
      "kannada": "string",
      "hindi": "string",
      "english": "string",
      "suggestedPriceRange": "string",
      "highlights": ["string"]
    }}
    """
    result = await call_gemini(prompt)
    return result


# ── POST /sale ───────────────────────────────────────────
@router.post("/sale")
async def record_sale(body: SaleRequest):
    commons_contribution = round(body.amount * 0.01, 2)

    # Write transaction edge
    db.collection("edges").add({
        "fromUserId": body.buyerId,
        "toUserId":   body.vendorId,
        "type":       "transaction",
        "weight":     round(body.amount / 1000, 2),
        "createdAt":  datetime.utcnow()
    })

    # Update commons fund balance
    commons_ref = db.collection("analytics").document("commonsFund")
    commons_snap = commons_ref.get()

    if commons_snap.exists:
        current = commons_snap.to_dict().get("balance", 0)
        commons_ref.update({"balance": current + commons_contribution})
    else:
        commons_ref.set({"balance": commons_contribution, "proposals": []})

    return {
        "success":            True,
        "commonContribution": commons_contribution,
        "message":            f"₹{commons_contribution} added to Cluster Commons Fund"
    }