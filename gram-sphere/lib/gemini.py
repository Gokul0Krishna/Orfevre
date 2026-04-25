import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel(
    model_name="gemini-1.5-pro",
    generation_config=genai.GenerationConfig(
        response_mime_type="application/json",   # structured output mode
        temperature=0.3,                          # lower = more consistent
    )
)


async def call_gemini(prompt: str) -> dict:
    """
    Call Gemini and parse the JSON response.
    Falls back to error dict instead of crashing the entire request.
    """
    try:
        response = model.generate_content(prompt)
        text     = response.text.strip()

        # Strip markdown fences if Gemini adds them despite JSON mode
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        return json.loads(text)

    except json.JSONDecodeError:
        return {"error": "Gemini returned invalid JSON", "raw": text}
    except Exception as e:
        return {"error": str(e)}