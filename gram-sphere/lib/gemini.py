from google import genai
from google.genai import types
import json
import os
import base64
from dotenv import load_dotenv

load_dotenv()

# Initialize the client with the new SDK
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_ID = "gemini-2.0-flash"  # Multi-modal capable model

async def call_gemini(prompt: str, media_bytes: list[bytes] = None, mime_type: str = "image/jpeg") -> dict:
    """
    Call Gemini using the new google-genai SDK and parse the JSON response.
    Supports multi-modal input (images/videos).
    """
    try:
        contents = [prompt]
        if media_bytes:
            for b in media_bytes:
                contents.append(
                    types.Part.from_bytes(
                        data=b,
                        mime_type=mime_type
                    )
                )

        # Use structured output configuration
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            )
        )
        
        text = response.text.strip()

        # Strip markdown fences if Gemini adds them despite JSON mode
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        return json.loads(text)

    except json.JSONDecodeError:
        return {"error": "Gemini returned invalid JSON", "raw": text if 'text' in locals() else "No text returned"}
    except Exception as e:
        return {"error": str(e)}