from google import genai
from google.genai import types
import json
import os
import base64
from dotenv import load_dotenv

load_dotenv()

# Initialize the client with the new SDK (google-genai)
# This replaces the old genai.configure() pattern
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_ID = "gemini-2.0-flash"

async def call_gemini(prompt: str, media_bytes: list[bytes] = None, mime_type: str = "image/jpeg") -> dict:
    """
    Unified function to call Gemini (supports text and images/videos).
    Uses the new google-genai client.
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
        contents = [prompt]
        if media_bytes:
            for b in media_bytes:
                contents.append(
                    types.Part.from_bytes(
                        data=b,
                        mime_type=mime_type
                    )
                )

        # Generate response
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )
        text = response.text.strip()

        # Handle potential markdown fences in JSON response
        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else parts[0]
            if text.startswith("json"):
                text = text[4:]

        return json.loads(text.strip())

    except json.JSONDecodeError as e:
        return {
            "error": f"Gemini returned invalid JSON: {str(e)}", 
            "raw": text if 'text' in locals() else "No text returned"
        }
    except Exception as e:
        return {"error": str(e)}