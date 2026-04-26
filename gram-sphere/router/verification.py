from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from lib.firestore import db
from lib.geo_validator import (
    extract_gps_from_image,
    extract_gps_from_video,
    validate_location,
    reverse_geocode
)
from lib.gemini import call_gemini
from datetime import datetime
import google.generativeai as genai
import uuid
import os
import tempfile
import base64
import json

router = APIRouter()


# ── TIER THRESHOLDS ──────────────────────────────────────────────────
# How many verified work entries are needed per tier.
# Combined with AI portfolio score from Layer 1.

TIER_RULES = {
    "master": {
        "min_entries":        10,
        "min_ai_score":        75,
        "min_avg_gig_rating":  4.2,
        "description":         "Market Proven Artisan"
    },
    "gold": {
        "min_entries":        5,
        "min_ai_score":       60,
        "min_avg_gig_rating": 0,    # gig ratings not required for gold
        "description":        "Track Record Verified Artisan"
    },
    "silver": {
        "min_entries":        2,
        "min_ai_score":       40,
        "min_avg_gig_rating": 0,
        "description":        "Portfolio Verified Artisan"
    },
    "bronze": {
        "min_entries":        0,
        "min_ai_score":       0,
        "min_avg_gig_rating": 0,
        "description":        "Declared Artisan"
    }
}

IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/heic", "image/webp"}
VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/3gpp"}


# ── POST /verify/upload-work ─────────────────────────────────────────

@router.post("/verify/upload-work")
async def upload_work_evidence(
    user_id:         str        = Form(...),
    trade:           str        = Form(...),
    claimed_level:   str        = Form(...),  # beginner|intermediate|advanced|master
    work_description:str        = Form(...),  # "Built a wardrobe for a client in Mandya"
    file:            UploadFile = File(...)
):
    """
    Main verification endpoint. Accepts a photo or video of completed work.

    Pipeline:
      1. Validate file type and size
      2. Extract GPS metadata from file
      3. Validate GPS against user's registered city (within 100km)
      4. Run Gemini Vision AI assessment on the work
      5. Write a verified work entry to the track record
      6. Recalculate certificate tier
      7. Return full result
    """

    # ── 1. File validation ───────────────────────────────────────────
    content_type = file.content_type or ""
    is_image     = content_type in IMAGE_TYPES
    is_video     = content_type in VIDEO_TYPES

    if not is_image and not is_video:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {content_type}. "
                   f"Accepted: JPEG, PNG, MP4, MOV, AVI."
        )

    file_bytes = await file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)

    max_mb = 15 if is_image else 200
    if file_size_mb > max_mb:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {file_size_mb:.1f}MB. Max: {max_mb}MB."
        )

    # ── 2. Fetch user's registered city ─────────────────────────────
    user_ref  = db.collection("users").document(user_id)
    user_snap = user_ref.get()

    if not user_snap.exists:
        raise HTTPException(status_code=404, detail="User not found.")

    user_data        = user_snap.to_dict()
    registered_city  = user_data.get("district", "") + ", Karnataka"
    # e.g. "Mysuru, Karnataka" — district is what we store on signup

    # ── 3. Extract GPS from file ─────────────────────────────────────
    gps_coords = None

    if is_image:
        gps_coords = extract_gps_from_image(file_bytes)

    elif is_video:
        # Write video to a temp file for ffprobe
        suffix = "." + (file.filename or "video.mp4").rsplit(".", 1)[-1]
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:
            gps_coords = extract_gps_from_video(tmp_path)
        finally:
            os.unlink(tmp_path)   # always clean up temp file

    # ── 4. Geo validation ────────────────────────────────────────────
    geo_result = validate_location(
        gps_coords=gps_coords,
        registered_city=registered_city,
        max_radius_km=100.0
    )

    # Hard block: if GPS exists but is clearly outside Karnataka
    # If no GPS at all → soft warning, don't block (some devices strip EXIF)
    if gps_coords and not geo_result["valid"]:
        raise HTTPException(
            status_code=422,
            detail={
                "error":   "location_mismatch",
                "message": geo_result["message"],
                "details": geo_result
            }
        )

    gps_warning = None
    if not gps_coords:
        gps_warning = (
            "No GPS metadata found in this file. "
            "The work entry will be recorded but marked as location-unverified. "
            "Enable location tagging in your camera app for stronger verification."
        )

    # ── 5. Gemini Vision AI assessment ───────────────────────────────
    ai_assessment = await _run_gemini_assessment(
        file_bytes    = file_bytes,
        is_image      = is_image,
        is_video      = is_video,
        file_bytes_raw= file_bytes,
        trade         = trade,
        claimed_level = claimed_level
    )

    # ── 6. Write verified work entry to track record ─────────────────
    entry_id = str(uuid.uuid4())

    work_entry = {
        "entryId":          entry_id,
        "userId":           user_id,
        "trade":            trade,
        "claimedLevel":     claimed_level,
        "workDescription":  work_description,
        "fileType":         "image" if is_image else "video",
        "fileSizeMb":       round(file_size_mb, 2),

        # Geo data
        "geoVerified":      gps_coords is not None and geo_result["valid"],
        "gpsCoords":        gps_coords,
        "workLocation":     geo_result.get("work_location"),
        "registeredCity":   registered_city,
        "distanceKm":       geo_result.get("distance_km"),
        "geoValidation":    geo_result,

        # AI assessment
        "aiScore":          ai_assessment.get("overall_score", 0),
        "aiComplexity":     ai_assessment.get("complexity_level"),
        "aiLevelMatch":     ai_assessment.get("claimed_level_match", False),
        "aiRedFlags":       ai_assessment.get("red_flags", []),
        "aiAssessment":     ai_assessment,

        # Computed trust weight for this single entry
        "entryTrustWeight": _compute_entry_weight(
            geo_verified  = gps_coords is not None and geo_result["valid"],
            ai_score      = ai_assessment.get("overall_score", 0),
            level_matched = ai_assessment.get("claimed_level_match", False)
        ),

        "submittedAt":      datetime.utcnow(),
        "status":           "verified"
    }

    db.collection("work_entries").document(entry_id).set(work_entry)

    # ── 7. Recalculate certificate tier ──────────────────────────────
    certificate = await _recalculate_certificate(
        user_id = user_id,
        trade   = trade,
        user_data = user_data
    )

    return {
        "success":        True,
        "entryId":        entry_id,

        "geoVerification": {
            "verified":        gps_coords is not None and geo_result["valid"],
            "workLocation":    geo_result.get("work_location"),
            "distanceKm":      geo_result.get("distance_km"),
            "message":         geo_result.get("message"),
            "warning":         gps_warning
        },

        "aiAssessment": {
            "overallScore":     ai_assessment.get("overall_score"),
            "complexityLevel":  ai_assessment.get("complexity_level"),
            "claimedLevelMatch":ai_assessment.get("claimed_level_match"),
            "redFlags":         ai_assessment.get("red_flags", []),
            "assessorNote":     ai_assessment.get("assessor_note")
        },

        "entryTrustWeight": work_entry["entryTrustWeight"],
        "certificate":      certificate,

        "message": (
            f"Work entry recorded. "
            f"You now have {certificate['verifiedEntries']} verified entries. "
            f"Current tier: {certificate['tier'].upper()}."
        )
    }


# ── GET /verify/track-record/{user_id} ──────────────────────────────

@router.get("/verify/track-record/{user_id}")
async def get_track_record(user_id: str):
    """
    Returns the full verified work history for a carpenter.
    This is what judges and clients see when they view a profile.
    """
    entries_ref = (
        db.collection("work_entries")
          .where("userId", "==", user_id)
          .order_by("submittedAt", direction="DESCENDING")
          .stream()
    )
    entries = [e.to_dict() for e in entries_ref]

    cert_ref  = db.collection("certificates").document(user_id)
    cert_snap = cert_ref.get()
    certificate = cert_snap.to_dict() if cert_snap.exists else {}

    # Summary statistics
    geo_verified_count = sum(1 for e in entries if e.get("geoVerified"))
    avg_ai_score = (
        sum(e.get("aiScore", 0) for e in entries) / len(entries)
        if entries else 0
    )
    level_distribution = {}
    for e in entries:
        lvl = e.get("aiComplexity", "unknown")
        level_distribution[lvl] = level_distribution.get(lvl, 0) + 1

    return {
        "userId":              user_id,
        "totalEntries":        len(entries),
        "geoVerifiedEntries":  geo_verified_count,
        "avgAiScore":          round(avg_ai_score, 1),
        "levelDistribution":   level_distribution,
        "certificate":         certificate,
        "entries":             entries
    }


# ── GET /verify/certificate/{user_id} ───────────────────────────────

@router.get("/verify/certificate/{user_id}")
async def get_certificate(user_id: str):
    """Public endpoint — anyone can call this to verify a certificate."""
    cert_ref  = db.collection("certificates").document(user_id)
    cert_snap = cert_ref.get()

    if not cert_snap.exists:
        raise HTTPException(
            status_code=404,
            detail="No certificate found for this user."
        )

    cert = cert_snap.to_dict()

    # Also return the 3 most recent verified entries as proof
    entries = list(
        db.collection("work_entries")
          .where("userId", "==", user_id)
          .order_by("submittedAt", direction="DESCENDING")
          .limit(3)
          .stream()
    )

    return {
        **cert,
        "recentWork": [
            {
                "workDescription": e.to_dict().get("workDescription"),
                "workLocation":    e.to_dict().get("workLocation"),
                "aiScore":         e.to_dict().get("aiScore"),
                "geoVerified":     e.to_dict().get("geoVerified"),
                "submittedAt":     str(e.to_dict().get("submittedAt"))
            }
            for e in entries
        ]
    }


# ── INTERNAL HELPERS ─────────────────────────────────────────────────


async def _run_gemini_assessment(
    file_bytes: bytes,
    is_image: bool,
    is_video: bool,
    file_bytes_raw: bytes,
    trade: str,
    claimed_level: str
) -> dict:
    """
    Runs Gemini Vision on the uploaded file.
    For videos: extracts 6 evenly spaced frames and assesses them together.
    Returns the AI assessment dict.
    """

    prompt = f"""
    You are a master {trade} and quality assessor with 30 years of experience
    in traditional Indian woodworking and craftsmanship.

    Analyse this {'image' if is_image else 'set of video frames'} of {trade}
    work submitted by someone claiming to be a {claimed_level}-level {trade}.

    Evaluate the following and return ONLY valid JSON:
    {{
      "joint_quality":      {{ "score": 0, "observation": "string" }},
      "surface_finishing":  {{ "score": 0, "observation": "string" }},
      "structural_form":    {{ "score": 0, "observation": "string" }},
      "tool_usage":         {{ "score": 0, "observation": "string" }},
      "complexity_level":   "basic|intermediate|advanced|master",
      "claimed_level_match": true,
      "red_flags":          ["string"],
      "overall_score":      0,
      "assessor_note":      "string"
    }}

    Scoring guide (each dimension 0–10):
    - joint_quality:     Are joints clean, flush, gap-free?
    - surface_finishing: Is sanding even? Are edges crisp?
    - structural_form:   Does the piece look proportional and load-bearing?
    - tool_usage:        Are tool marks appropriate for the claimed level?

    overall_score: weighted average × 10. Max 100.
    Be strict. Beginner work must not pass as advanced.
    red_flags: list any signs of staged photos, internet images,
    or skill level inconsistency.
    """

    model = genai.GenerativeModel(
        model_name="gemini-pro-latest",
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.2
        )
    )

    try:
        if is_image:
            image_part = {
                "mime_type": "image/jpeg",
                "data":      base64.b64encode(file_bytes).decode("utf-8")
            }
            response = model.generate_content([prompt, image_part])

        else:
            # Video: extract 6 frames using ffprobe + ffmpeg
            frames = await _extract_video_frames(file_bytes_raw)
            if not frames:
                # fallback: no frames extracted, return a low default score
                return {
                    "overall_score": 30,
                    "complexity_level": "basic",
                    "claimed_level_match": False,
                    "red_flags": ["Could not extract frames from video."],
                    "assessor_note": "Video could not be analysed. Please resubmit."
                }

            # Send all frames together in a single Gemini call
            parts = [prompt] + [
                {"mime_type": "image/jpeg", "data": base64.b64encode(f).decode()}
                for f in frames
            ]
            response = model.generate_content(parts)

        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        return json.loads(text)

    except Exception as e:
        return {
            "overall_score":      0,
            "complexity_level":   "unknown",
            "claimed_level_match": False,
            "red_flags":          [str(e)],
            "assessor_note":      "AI assessment failed. Entry recorded without AI score."
        }


async def _extract_video_frames(video_bytes: bytes) -> list[bytes]:
    """
    Writes video to a temp file, uses ffmpeg to extract 6 evenly-spaced
    frames as JPEG bytes. Returns list of frame byte strings.
    """
    frames = []
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = os.path.join(tmpdir, "input.mp4")
        with open(video_path, "wb") as f:
            f.write(video_bytes)

        # Get video duration first
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_format", video_path],
            capture_output=True, text=True, timeout=15
        )
        duration = 30.0   # default
        try:
            probe_data = json.loads(probe.stdout)
            duration   = float(probe_data["format"].get("duration", 30.0))
        except Exception:
            pass

        # Extract 6 frames at evenly spaced intervals
        interval = duration / 7
        for i in range(1, 7):
            timestamp   = round(interval * i, 2)
            frame_path  = os.path.join(tmpdir, f"frame_{i}.jpg")
            subprocess.run(
                [
                    "ffmpeg", "-ss", str(timestamp),
                    "-i",     video_path,
                    "-frames:v", "1",
                    "-q:v",   "3",       # quality 1–31, lower = better
                    "-vf",    "scale=960:-1",   # resize for faster upload
                    frame_path,
                    "-y"
                ],
                capture_output=True,
                timeout=20
            )
            if os.path.exists(frame_path):
                with open(frame_path, "rb") as f:
                    frames.append(f.read())

    return frames


def _compute_entry_weight(
    geo_verified: bool,
    ai_score: float,
    level_matched: bool
) -> float:
    """
    Each work entry carries a trust weight from 0.0 to 1.0.
    This weight feeds into the certificate tier calculation.

    geo_verified:  was the GPS location confirmed within 100km?  (+0.3)
    ai_score:      Gemini visual assessment score 0–100           (+0.5 max)
    level_matched: did AI agree the work matches the claimed tier (+0.2)
    """
    weight = 0.0
    if geo_verified:
        weight += 0.30
    weight += (ai_score / 100) * 0.50
    if level_matched:
        weight += 0.20
    return round(min(weight, 1.0), 3)


async def _recalculate_certificate(
    user_id: str,
    trade: str,
    user_data: dict
) -> dict:
    """
    Fetches all work entries for a user, applies tier rules,
    issues or upgrades the certificate, and writes it to Firestore.
    """

    entries = [
        e.to_dict() for e in
        db.collection("work_entries")
          .where("userId", "==", user_id)
          .where("trade",  "==", trade)
          .stream()
    ]

    verified_entries = len(entries)
    avg_ai_score     = (
        sum(e.get("aiScore", 0) for e in entries) / verified_entries
        if verified_entries else 0
    )
    avg_gig_rating   = user_data.get("avgGigRating", 0)
    geo_verified     = sum(1 for e in entries if e.get("geoVerified"))
    total_weight     = sum(e.get("entryTrustWeight", 0) for e in entries)

    # Determine tier
    tier = "bronze"
    for tier_name in ("master", "gold", "silver"):
        rules = TIER_RULES[tier_name]
        if (
            verified_entries  >= rules["min_entries"]      and
            avg_ai_score      >= rules["min_ai_score"]     and
            avg_gig_rating    >= rules["min_avg_gig_rating"]
        ):
            tier = tier_name
            break

    cert_id = (
        db.collection("certificates")
          .document(user_id)
          .get()
          .to_dict() or {}
    ).get("certificateId") or f"GS-{trade[:4].upper()}-{uuid.uuid4().hex[:8].upper()}"

    trust_weight_map = {
        "master": 1.0,
        "gold":   0.8,
        "silver": 0.5,
        "bronze": 0.2
    }

    certificate = {
        "certificateId":    cert_id,
        "userId":           user_id,
        "holderName":       user_data.get("name"),
        "trade":            trade,
        "district":         user_data.get("district"),
        "tier":             tier,
        "tierDescription":  TIER_RULES[tier]["description"],
        "verifiedEntries":  verified_entries,
        "geoVerifiedEntries": geo_verified,
        "avgAiScore":       round(avg_ai_score, 1),
        "avgGigRating":     avg_gig_rating,
        "totalTrustWeight": round(total_weight, 3),
        "certTrustWeight":  trust_weight_map[tier],
        "nextTier":         _next_tier_info(
                                tier, verified_entries,
                                avg_ai_score, avg_gig_rating
                            ),
        "verifyUrl":        f"https://gramsphere.web.app/verify/{cert_id}",
        "issuedAt":         datetime.utcnow().isoformat(),
        "lastUpdated":      datetime.utcnow().isoformat()
    }

    db.collection("certificates").document(user_id).set(certificate)
    db.collection("users").document(user_id).update({
        "certTier":        tier,
        "certTrade":       trade,
        "certificateId":   cert_id,
        "certTrustWeight": trust_weight_map[tier]
    })

    return certificate


def _next_tier_info(
    current_tier: str,
    entries: int,
    avg_ai_score: float,
    avg_gig_rating: float
) -> Optional[dict]:
    """
    Returns what the carpenter needs to do to reach the next tier.
    Returns None if already at Master.
    """
    tier_order = ["bronze", "silver", "gold", "master"]
    current_idx = tier_order.index(current_tier)

    if current_idx == len(tier_order) - 1:
        return None   # already at master

    next_tier  = tier_order[current_idx + 1]
    next_rules = TIER_RULES[next_tier]

    gaps = []

    entries_needed = next_rules["min_entries"] - entries
    if entries_needed > 0:
        gaps.append(f"Upload {entries_needed} more verified work entries")

    score_needed = next_rules["min_ai_score"] - avg_ai_score
    if score_needed > 0:
        gaps.append(f"Improve work quality — AI score needs to be {next_rules['min_ai_score']}+")

    rating_needed = next_rules["min_avg_gig_rating"] - avg_gig_rating
    if rating_needed > 0:
        gaps.append(f"Achieve a gig rating of {next_rules['min_avg_gig_rating']}+ from clients")

    return {
        "tier":  next_tier,
        "gaps":  gaps if gaps else ["All requirements met — tier upgrade processing"]
    }