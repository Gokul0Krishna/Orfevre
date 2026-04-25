from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.firestore import db
from lib.graph_engine import (
    compute_trust_score,
    get_neighbor_avg_trust
)
from datetime import datetime
import uuid

router = APIRouter()


# ── REQUEST MODELS ──────────────────────────────────────
class LoanApplyRequest(BaseModel):
    userId:   str
    amount:   float
    purpose:  str
    duration: int            # months

class VouchRequest(BaseModel):
    voucherId:  str
    borrowerId: str


# ── POST /loan/apply ─────────────────────────────────────
@router.post("/loan/apply")
async def apply_for_loan(body: LoanApplyRequest):
    user_ref  = db.collection("users").document(body.userId)
    user_snap = user_ref.get()

    if not user_snap.exists:
        raise HTTPException(status_code=404, detail="User not found")

    # Scoring components
    trust_score       = compute_trust_score(body.userId)
    neighbor_avg      = get_neighbor_avg_trust(body.userId)

    user_data = user_snap.to_dict()
    loans     = db.collection("loans")\
                  .where("applicantId", "==", body.userId)\
                  .stream()
    loan_list = [l.to_dict() for l in loans]

    completed = sum(1 for l in loan_list if l.get("status") == "repaid")
    total     = len(loan_list)
    repayment_rate = (completed / total) if total > 0 else 1.0

    # Final score
    final_score = (
        trust_score    * 0.50 +
        neighbor_avg   * 0.30 +
        repayment_rate * 100  * 0.20
    )
    final_score = round(min(final_score, 100), 1)

    # Decision
    if final_score >= 60:
        decision   = "APPROVED"
        max_amount = round(final_score * 150)
    elif final_score >= 40:
        decision   = "CONDITIONAL"
        max_amount = round(final_score * 75)
    else:
        decision   = "REJECTED"
        max_amount = 0

    # Write loan to Firestore
    loan_id = str(uuid.uuid4())
    db.collection("loans").document(loan_id).set({
        "id":          loan_id,
        "applicantId": body.userId,
        "amount":      body.amount,
        "purpose":     body.purpose,
        "duration":    body.duration,
        "score":       final_score,
        "decision":    decision,
        "maxAmount":   max_amount,
        "status":      "pending",
        "createdAt":   datetime.utcnow()
    })

    return {
        "score":      final_score,
        "decision":   decision,
        "maxAmount":  max_amount,
        "breakdown": {
            "trustScore":      trust_score,
            "neighborAvg":     neighbor_avg,
            "repaymentRate":   round(repayment_rate * 100, 1)
        }
    }


# ── POST /loan/vouch ─────────────────────────────────────
@router.post("/loan/vouch")
async def vouch_for_borrower(body: VouchRequest):
    voucher_score = compute_trust_score(body.voucherId)

    if voucher_score < 50:
        raise HTTPException(
            status_code=400,
            detail=f"Trust score too low to vouch. Need 50, have {voucher_score}"
        )

    # Write vouch edge to Firestore
    db.collection("edges").add({
        "fromUserId": body.voucherId,
        "toUserId":   body.borrowerId,
        "type":       "vouch",
        "weight":     1.0,
        "createdAt":  datetime.utcnow()
    })

    # Boost borrower trust score (+8 per vouch, up to 3 vouches)
    borrower_ref  = db.collection("users").document(body.borrowerId)
    borrower_snap = borrower_ref.get()
    current_score = borrower_snap.to_dict().get("trustScore", 20)
    new_score     = min(current_score + 8, 100)
    borrower_ref.update({"trustScore": new_score})

    return {
        "success":      True,
        "newTrustScore": new_score,
        "message":      f"Vouch registered. Borrower trust score: {current_score} → {new_score}"
    }