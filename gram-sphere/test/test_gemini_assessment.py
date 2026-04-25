import pytest
import os
from lib.gemini import call_gemini
import base64


# ── SKIP ALL IF NO API KEY ───────────────────────────────────────────
pytestmark = pytest.mark.skipif(
    not os.getenv("GEMINI_API_KEY"),
    reason="GEMINI_API_KEY not set — skipping Gemini tests"
)


class TestGeminiPrompts:

    @pytest.mark.asyncio
    async def test_skill_gap_returns_expected_schema(self):
        """
        Calls the real Gemini API with a carpenter profile.
        Confirms the response matches the schema we expect.
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
        result = await call_gemini(prompt)

        assert "error" not in result, f"Gemini returned error: {result}"
        assert "skill_gaps"          in result
        assert "recommended_gigs"    in result
        assert "local_demand_context" in result
        assert "top_skill_to_learn"  in result
        assert isinstance(result["skill_gaps"], list)
        assert len(result["skill_gaps"]) > 0
        print(f"\nSkill gaps returned: {result['skill_gaps']}")

    @pytest.mark.asyncio
    async def test_demand_forecast_returns_expected_schema(self):
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
        result = await call_gemini(prompt)

        assert "error" not in result
        assert "forecast"       in result
        assert "festivalAlert"  in result
        assert isinstance(result["forecast"], list)
        assert len(result["forecast"]) > 0
        print(f"\nFestival alert: {result['festivalAlert']}")

    @pytest.mark.asyncio
    async def test_listing_generator_returns_three_languages(self):
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
        result = await call_gemini(prompt)

        assert "error"   not in result
        assert "kannada" in result
        assert "hindi"   in result
        assert "english" in result
        assert len(result["kannada"])  > 10
        assert len(result["hindi"])    > 10
        assert len(result["english"])  > 10
        # print(f"\nKannada listing: {result['kannada'][:80]}...")

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not os.path.exists("tests/assets/real_carpentry.jpg"),
        reason="Real carpentry photo not provided"
    )
    async def test_vision_assessment_real_photo(self):
        """
        Runs the actual Gemini Vision assessment on a real carpentry photo.
        Add a photo to tests/assets/real_carpentry.jpg to enable this test.
        """
        import google.generativeai as genai

        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel(
            "gemini-pro-latest",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
        )

        with open("tests/assets/real_carpentry.jpg", "rb") as f:
            image_bytes = f.read()

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
            "data":      base64.b64encode(image_bytes).decode()
        }
        response = model.generate_content([prompt, image_part])
        import json
        result   = json.loads(response.text)

        assert "overall_score"    in result
        assert "complexity_level" in result
        assert 0 <= result["overall_score"] <= 100
        print(f"\nAI overall score:   {result['overall_score']}")
        print(f"Complexity level:   {result['complexity_level']}")
        print(f"Assessor note:      {result['assessor_note']}")
        print(f"Red flags:          {result['red_flags']}")