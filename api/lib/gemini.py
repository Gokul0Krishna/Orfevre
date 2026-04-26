from google import genai
from google.genai import types
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Set Model ID
MODEL_ID = "gemini-2.0-flash"

async def call_gemini(prompt: str, media_bytes: list[bytes] = None, mime_type: str = "image/jpeg") -> dict:
    """
    Unified function to call Gemini (supports text and images/videos).
    Uses the new google-genai client.
    """
    # Reload .env every call if you truly need dynamic key switching
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(env_path, override=True)

    api_key = os.getenv("GEMINI_API_KEY", "AIzaSyBQcz4FghMdWZz_NTK8cJ4q7LwEi9VLOmk")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in the .env file.")

    # Initialize client inside the function to use the refreshed API key
    client = genai.Client(api_key=api_key)

    # 1. Build the contents list
    # The first item is usually your text prompt
    contents = [prompt]

    # 2. Add media parts if they exist
    if media_bytes:
        for b in media_bytes:
            contents.append(
                types.Part.from_bytes(
                    data=b,
                    mime_type=mime_type
                )
            )

    try:
        # 3. Generate content
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
        # Note: With response_mime_type="application/json", 
        # Gemini usually returns raw JSON without backticks.
        if text.startswith("```"):
            text = text.strip("`").replace("json", "", 1).strip()

        return json.loads(text)

    except json.JSONDecodeError as e:
        return {
            "error": f"Gemini returned invalid JSON: {str(e)}", 
            "raw": text if 'text' in locals() else "No text returned"
        }
    except Exception as e:
        return {"error": str(e)}