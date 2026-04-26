try:
    from google import genai
    print("Google GenAI import successful!")
except ImportError as e:
    print(f"Google GenAI import failed: {e}")
    try:
        import google.genai as genai
        print("Import google.genai as genai successful!")
    except ImportError as e2:
        print(f"Alternative import failed: {e2}")
