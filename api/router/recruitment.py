from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from lib.sql_connect import engine
from lib.gemini import call_gemini
from typing import Optional
import datetime
import uuid

router = APIRouter()

class ParseGigRequest(BaseModel):
    merchant_uid: str
    text: str          # The raw spoken/typed input from the merchant

class PostGigRequest(BaseModel):
    merchant_uid: str
    shop_id: Optional[str] = ""
    title: str
    trade: str
    description: str
    district: str
    area: str
    budget: str
    duration: str
    slots: int = 1
    tokens_reward: int = 1


# -- POST /recruitment/parse-gig ------------------------------------------
@router.post("/recruitment/parse-gig")
async def parse_gig(body: ParseGigRequest):
    """
    Use Gemini to extract a structured gig posting from merchant's natural-language speech.
    """
    # Fetch merchant's shop context from SQL
    shop_context = ""
    with engine.connect() as conn:
        shop = conn.execute(text("SELECT shop_name, business_type, shop_district FROM merchants WHERE user_id = :uid"), {"uid": body.merchant_uid}).fetchone()
        if shop:
            shop_context = f"Shop: {shop.shop_name}, Trade: {shop.business_type}, District: {shop.shop_district}"

    # ── Step 1: Grammar + ASR correction ──────────────────────────────────
    correction_prompt = f"""
    The following text was spoken by an Indian merchant into a voice recorder.
    Clean it up into clear, grammatical English.
    
    Original: "{body.text}"
    
    Return ONLY valid JSON:
    {{"corrected": "the cleaned up text"}}
    """
    
    correction = await call_gemini(correction_prompt)
    corrected_text = correction.get("corrected", body.text)

    # ── Step 2: Extract structured gig from corrected text ─────────────────
    prompt = f"""
You are a recruitment assistant for YuvaShakti.
Merchant context: {shop_context if shop_context else "Small business in Karnataka"}
Merchant's request (cleaned): "{corrected_text}"

Extract the structured job posting. 
- Pick trade from: Tailor, Carpenter, Electronics Repair, Potter, Weaver, Cobbler, Blacksmith, Farmer, Plumbing, Painting, Photography, General Labour, Other.

Return ONLY valid JSON:
{{
  "title": "short job title",
  "trade": "trade category",
  "description": "1-2 sentence description",
  "district": "district name",
  "area": "area name",
  "budget": "₹XXXX",
  "duration": "X days",
  "slots": 1,
  "tokens_reward": 1
}}
"""
    result = await call_gemini(prompt)
    return {"success": True, "parsed": result, "corrected_input": corrected_text}


# -- POST /recruitment/post-gig -------------------------------------------
@router.post("/recruitment/post-gig")
async def post_gig(body: PostGigRequest):
    """
    Save the confirmed gig to SQL.
    """
    gig_id = str(uuid.uuid4())
    
    # Fetch shop ID if not provided
    shop_id = body.shop_id
    with engine.connect() as conn:
        if not shop_id:
            shop = conn.execute(text("SELECT id FROM merchants WHERE user_id = :uid"), {"uid": body.merchant_uid}).fetchone()
            if shop:
                shop_id = shop.id

        conn.execute(text("""
            INSERT INTO gigs (id, merchant_uid, shop_id, title, trade, description, district, area, budget, duration, slots, tokens_reward, status)
            VALUES (:id, :m_uid, :s_id, :title, :trade, :desc, :dist, :area, :budget, :dur, :slots, :tokens, 'open')
        """), {
            "id": gig_id,
            "m_uid": body.merchant_uid,
            "s_id": shop_id,
            "title": body.title,
            "trade": body.trade,
            "desc": body.description,
            "dist": body.district,
            "area": body.area,
            "budget": body.budget,
            "dur": body.duration,
            "slots": body.slots,
            "tokens": body.tokens_reward
        })
        conn.commit()

    return {"success": True, "gig_id": gig_id}
