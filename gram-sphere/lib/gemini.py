from google import genai
from google.genai import types
import json
import os
from dotenv import load_dotenv


async def call_gemini(prompt: str) -> dict:
    """
    Call Gemini using the new google-genai SDK and parse the JSON response.
    Falls back to error dict instead of crashing the entire request.
    """
    # Reload .env every call so no backend restart is needed
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(env_path, override=True)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in the .env file.")

    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )
        text = response.text.strip()

        # Strip markdown fences if Gemini adds them despite JSON mode
        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else parts[0]
            if text.startswith("json"):
                text = text[4:]

        return json.loads(text.strip())

    except json.JSONDecodeError as e:
        return {"error": f"Gemini returned invalid JSON: {str(e)}", "raw": text}
    except Exception as e:
        return {"error": str(e)}