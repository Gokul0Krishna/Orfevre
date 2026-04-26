from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.firestore import db
from lib.gemini import call_gemini
from typing import Optional
import datetime

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
    Step 1: Clean/correct the speech transcript (handles filler words, ASR errors).
    Step 2: Extract structured gig data from the cleaned text.
    """
    # Fetch merchant's shop context to enrich the prompt
    shop_context = ""
    shops = db.collection("shops").where("merchant_uid", "==", body.merchant_uid).stream()
    for doc in shops:
        s = doc.to_dict()
        shop_context = f"Shop: {s.get('shop_name')}, Trade: {s.get('business_type')}, Location: {s.get('area')}, {s.get('district')}"
        break

    # ── Step 1: Grammar + ASR correction ──────────────────────────────────
    correction_prompt = f"""
    The following text was spoken by an Indian merchant into a voice recorder.
    It may contain speech recognition errors, filler words like "so", "um", "uh",
    repetitions, or Hinglish (Hindi-English mix).
    
    Clean it up into clear, grammatical English while preserving all the key facts
    (job type, duration, location, budget). Do not add or infer new information.
    
    Original: "{body.text}"
    
    Return ONLY valid JSON:
    {{"corrected": "the cleaned up text"}}
    """
    
    correction = await call_gemini(correction_prompt)
    if "error" in correction:
        # If correction fails, use original text
        corrected_text = body.text
    else:
        corrected_text = correction.get("corrected", body.text)

    # ── Step 2: Extract structured gig from corrected text ─────────────────
    prompt = f"""
You are a recruitment assistant for YuvaShakti, a platform connecting rural Indian youth with local artisan merchants in Karnataka.

Merchant context: {shop_context if shop_context else "Small business in Karnataka"}
Merchant's request (cleaned): "{corrected_text}"

Extract the structured job posting. Be smart — infer missing fields from context.
- For budget: extract the rupee amount as a string like "₹1200". If not mentioned, use "Negotiable".
- For duration: extract like "2 days" or "4 hours". If not mentioned, use "1 day".
- For district: use what's mentioned. If a city/town name is given that isn't a Karnataka district, map it to the nearest Karnataka district or keep the name as-is.
- For trade: pick from: Tailor, Carpenter, Electronics Repair, Potter, Weaver, Cobbler, Blacksmith, Farmer, Plumbing, Painting, Photography, General Labour, Other.
- For slots: how many workers needed. Default 1.

Return ONLY valid JSON:
{{
  "title": "short job title, max 6 words",
  "trade": "trade category from the list",
  "description": "1-2 sentence job description in clear English",
  "district": "district or city name",
  "area": "locality or area name, empty string if unknown",
  "budget": "₹XXXX or Negotiable",
  "duration": "X days or X hours",
  "slots": 1,
  "tokens_reward": 1,
  "confidence": 0.9,
  "corrected_input": "{corrected_text}"
}}
"""
    result = await call_gemini(prompt)
    
    if "error" in result:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini parsing failed: {result['error']}"
        )

    return {"success": True, "parsed": result, "corrected_input": corrected_text}


# -- POST /recruitment/post-gig -------------------------------------------
@router.post("/recruitment/post-gig")
async def post_gig(body: PostGigRequest):
    """
    Save the confirmed gig to Firestore.
    """
    # Fetch shop ID
    shop_id = body.shop_id
    if not shop_id:
        shops = db.collection("shops").where("merchant_uid", "==", body.merchant_uid).stream()
        for doc in shops:
            shop_id = doc.id
            break

    gig_data = {
        "merchant_uid": body.merchant_uid,
        "shop_id": shop_id,
        "title": body.title,
        "trade": body.trade,
        "description": body.description,
        "district": body.district,
        "area": body.area,
        "budget": body.budget,
        "duration": body.duration,
        "slots": body.slots,
        "tokensReward": body.tokens_reward,
        "status": "open",
        "hired": [],
        "created_at": datetime.datetime.utcnow().isoformat(),
    }

    ref = db.collection("gigs").document()
    ref.set(gig_data)

    return {"success": True, "gig_id": ref.id, "gig": gig_data}
