import pytest
import os
import base64
import json
from pathlib import Path
from typing import Dict, Any

import google.generativeai as genai
from lib.gemini import call_gemini
from dotenv import load_dotenv

# Load .env explicitly for module-level skipif checks
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
print(f"DEBUG: Gemini Key found: {bool(os.getenv('GEMINI_API_KEY'))}")

# ── CONFIGURATION & ASSETS ───────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
REAL_PHOTO_PATH = ASSETS_DIR / "real_carpentry.jpg"

class TestGeminiPrompts:
    """
    Tests for Gemini-powered features in the GramSphere ecosystem.
    Verifies schema compliance and multi-modal capabilities.
    """

    @pytest.mark.asyncio
    async def test_skill_gap_returns_expected_schema(self):
        """
        Calls the Gemini API with a carpenter profile.
        Confirms the response matches the expected JSON schema.
        """
        prompt = """
        You are an economic development advisor for Karnataka's informal economy.

        Profile:
        - Trade: carpenter
        - Current skills: basic sawing, nailing, sanding
        - District: Mysuru
        - Goal: first gig

        Return ONLY valid JSON:
        {
          "skill_gaps": ["string"],
          "recommended_gigs": [{"title": "string", "requiredSkill": "string", "matchScore": 0}],
          "local_demand_context": "string",
          "top_skill_to_learn": "string"
        }
        """
        result: Dict[str, Any] = await call_gemini(prompt)

        if "error" in result and "429" in result["error"]:
            pytest.skip("Gemini API quota exceeded (429 RESOURCE_EXHAUSTED)")

        assert "error" not in result, f"Gemini returned error: {result}"
        required_keys = ["skill_gaps", "recommended_gigs", "local_demand_context", "top_skill_to_learn"]
        for key in required_keys:
            assert key in result, f"Missing key: {key}"
        
        assert isinstance(result["skill_gaps"], list)
        assert len(result["skill_gaps"]) > 0
        print(f"\n[DEBUG] Skill gaps: {result['skill_gaps']}")

    @pytest.mark.asyncio
    async def test_demand_forecast_returns_expected_schema(self):
        """Verifies demand forecasting JSON structure."""
        prompt = """
        You are a market intelligence analyst for rural Karnataka.

        Trade: carpenter
        District: Mandya
        Month: October
        Products:
        - Wooden chairs: stock=20, avg weekly sales=3

        Return ONLY valid JSON:
        {
          "forecast": [
            {
              "productName": "string",
              "expectedDemandChange": "string",
              "reasoning": "string",
              "recommendedAction": "string"
            }
          ],
          "festivalAlert": "string or null"
        }
        """
        result: Dict[str, Any] = await call_gemini(prompt)

        if "error" in result and "429" in result["error"]:
            pytest.skip("Gemini API quota exceeded (429 RESOURCE_EXHAUSTED)")

        assert "error" not in result
        assert "forecast" in result
        assert "festivalAlert" in result
        assert isinstance(result["forecast"], list)
        assert len(result["forecast"]) > 0

    @pytest.mark.asyncio
    async def test_listing_generator_returns_three_languages(self):
        """Checks if listing generator returns Kannada, Hindi, and English versions."""
        prompt = """
        Generate a marketplace listing for:
        Product: handmade teak wood bookshelf
        Trade: carpenter
        District: Mysuru

        Return ONLY valid JSON:
        {
          "kannada": "string",
          "hindi": "string",
          "english": "string",
          "suggestedPriceRange": "string",
          "highlights": ["string"]
        }
        """
        result: Dict[str, Any] = await call_gemini(prompt)

        if "error" in result and "429" in result["error"]:
            pytest.skip("Gemini API quota exceeded (429 RESOURCE_EXHAUSTED)")

        assert "error" not in result
        for lang in ["kannada", "hindi", "english"]:
            assert lang in result
            assert len(result[lang]) > 10

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not REAL_PHOTO_PATH.exists(),
        reason=f"Real carpentry photo not found at {REAL_PHOTO_PATH}"
    )
    async def test_vision_assessment_real_photo(self):
        """
        Runs the actual Gemini Vision assessment on a real carpentry photo.
        Requires a photo at test/assets/real_carpentry.jpg.
        """
        api_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel(
            "gemini-1.5-flash",  # Updated to modern flash model
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
        )

        image_bytes = REAL_PHOTO_PATH.read_bytes()

        prompt = """
        You are a master carpenter and quality assessor.
        Analyse this carpentry work image.

        Return ONLY valid JSON:
        {
          "joint_quality":      { "score": 0, "observation": "string" },
          "surface_finishing":  { "score": 0, "observation": "string" },
          "structural_form":    { "score": 0, "observation": "string" },
          "tool_usage":         { "score": 0, "observation": "string" },
          "complexity_level":   "basic|intermediate|advanced|master",
          "claimed_level_match": true,
          "red_flags":          [],
          "overall_score":      0,
          "assessor_note":      "string"
        }
        """

        image_part = {
            "mime_type": "image/jpeg",
            "data": base64.b64encode(image_bytes).decode()
        }
        
        response = model.generate_content([prompt, image_part])
        try:
            result = json.loads(response.text)
        except Exception:
            if "429" in response.text:
                pytest.skip("Gemini API quota exceeded (429 RESOURCE_EXHAUSTED)")
            raise

        assert "overall_score" in result
        assert "complexity_level" in result
        assert 0 <= result["overall_score"] <= 100
        print(f"\n[DEBUG] AI overall score: {result['overall_score']}")
        print(f"[DEBUG] Complexity: {result['complexity_level']}")