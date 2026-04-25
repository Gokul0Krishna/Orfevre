from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.firestore import db
from lib.graph_engine import compute_trust_score, get_cluster_velocity
from datetime import datetime

router = APIRouter()


class GigCompleteRequest(BaseModel):
    gigId:    str
    youthId:  str
    vendorId: str


class SkillGapRequest(BaseModel):
    trade:         str
    currentSkills: list[str]
    district:      str
    goal:          str


# ── POST /complete-gig ───────────────────────────────────
@router.post("/complete-gig")
async def complete_gig(body: GigCompleteRequest):
    # 1. Mark gig as completed
    gig_ref = db.collection("gigs").document(body.gigId)
    gig_ref.update({"status": "completed", "completedAt": datetime.utcnow()})

    gig_data = gig_ref.get().to_dict()
    tokens_reward = gig_data.get("tokensReward", 1)

    # 2. Award skill token to youth
    youth_ref  = db.collection("users").document(body.youthId)
    youth_snap = youth_ref.get().to_dict()
    new_tokens = youth_snap.get("skillTokens", 0) + tokens_reward
    youth_ref.update({"skillTokens": new_tokens})

    # 3. Write gig edge to Firestore
    #    Cloud Function will ALSO fire on this write and recompute scores
    db.collection("edges").add({
        "fromUserId": body.youthId,
        "toUserId":   body.vendorId,
        "type":       "gig",
        "weight":     1.0,
        "createdAt":  datetime.utcnow()
    })

    # 4. Recompute trust scores for both users
    #    Invalidate cache by deleting keys before recomputing
    from lib.graph_engine import trust_cache
    trust_cache.pop(body.youthId,  None)
    trust_cache.pop(body.vendorId, None)

    youth_score  = compute_trust_score(body.youthId)
    vendor_score = compute_trust_score(body.vendorId)

    # 5. Update trust scores in Firestore
    youth_ref.update({"trustScore": youth_score})
    db.collection("users").document(body.vendorId)\
      .update({"trustScore": vendor_score})

    # 6. Check if vendor's marketplace listing gate unlocks (score >= 40)
    marketplace_unlocked = vendor_score >= 40

    # 7. Recalculate Cluster Velocity
    from lib.graph_engine import velocity_cache
    velocity_cache.clear()
    velocity = get_cluster_velocity()

    return {
        "success":            True,
        "skillTokensEarned":  tokens_reward,
        "totalSkillTokens":   new_tokens,
        "youthTrustScore":    youth_score,
        "vendorTrustScore":   vendor_score,
        "marketplaceUnlocked": marketplace_unlocked,
        "clusterVelocity":    velocity
    }


# ── POST /skill-gap ──────────────────────────────────────
@router.post("/skill-gap")
async def skill_gap(body: SkillGapRequest):
    from lib.gemini import call_gemini

    prompt = f"""
    You are an economic development advisor for Karnataka's informal economy.
    Analyze this artisan's skill gaps against current local market demand.

    Profile:
    - Trade: {body.trade}
    - Current skills: {', '.join(body.currentSkills)}
    - District: {body.district}
    - Goal: {body.goal}

    Return ONLY valid JSON with this exact schema:
    {{
      "skill_gaps": ["string"],
      "recommended_gigs": [{{"title": "string", "requiredSkill": "string", "matchScore": 0}}],
      "local_demand_context": "string",
      "top_skill_to_learn": "string"
    }}
    """
    result = await call_gemini(prompt)
    return result


# ── GET /match-schemes/{user_id} ─────────────────────────
@router.get("/match-schemes/{user_id}")
async def match_schemes(user_id: str):
    from lib.schemes import KARNATAKA_SCHEMES
    from lib.gemini import call_gemini

    user_snap = db.collection("users").document(user_id).get()
    if not user_snap.exists:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_snap.to_dict()

    prompt = f"""
    You are a government scheme advisor for Karnataka.
    Match this artisan to the most relevant Karnataka government schemes.

    Artisan profile:
    - Trade: {user.get('trade')}
    - District: {user.get('district')}
    - Trust Score: {user.get('trustScore', 0)}
    - Skill Tokens: {user.get('skillTokens', 0)}
    - Gender: {user.get('gender', 'not specified')}

    Available schemes:
    {KARNATAKA_SCHEMES}

    Return ONLY valid JSON:
    {{
      "matches": [
        {{
          "schemeName": "string",
          "eligibilityPercent": 0,
          "reason": "string",
          "nextStep": "string"
        }}
      ]
    }}
    Rank by eligibility. Return top 3 only.
    """
    result = await call_gemini(prompt)
    return result