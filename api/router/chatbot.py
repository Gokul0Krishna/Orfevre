"""
chatbot.py — GramSphere Navigation Assistant.

Uses a keyword-matching knowledge base for instant responses (~5ms),
with Google Translate (via deep-translator) for multilingual support (~100ms).
No Gemini API dependency — fast, free, and reliable.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from deep_translator import GoogleTranslator
import re

router = APIRouter(tags=["chatbot"])

# ── Knowledge Base ─────────────────────────────────────────────────
# Each entry: (keywords_list, response, follow_up_suggestions)
KNOWLEDGE_BASE = [
    # ── Greetings ──
    {
        "keywords": ["hello", "hi", "hey", "help", "start", "namaste", "howdy"],
        "response": (
            "Hi! I'm Sahayak, your GramSphere guide 👋\n\n"
            "I can help you with:\n"
            "• Finding jobs (JobConnect)\n"
            "• Verifying your skills (Profile)\n"
            "• Selling products (BazaarPulse)\n"
            "• Viewing community maps (GramLens)\n\n"
            "What would you like to know?"
        ),
        "suggestions": ["How to find jobs?", "How to verify skills?", "What is BazaarPulse?"],
    },
    # ── JobConnect ──
    {
        "keywords": ["job", "jobs", "work", "gig", "employment", "hire", "vacancy", "opening", "career", "jobconnect"],
        "response": (
            "📋 JobConnect — Find Local Jobs\n\n"
            "Here's how to use it:\n"
            "1. Click 'JobConnect' in the left sidebar\n"
            "2. Browse jobs filtered by skill (weaving, carpentry, farming, etc.)\n"
            "3. Tap on any job card to see details\n"
            "4. Click 'Apply' to submit your application\n\n"
            "💡 Tip: You can verify your skills with your camera to get better job matches!"
        ),
        "suggestions": ["How to apply for a job?", "How to verify skills?", "What skills are available?"],
    },
    {
        "keywords": ["apply", "application", "submit", "resume"],
        "response": (
            "To apply for a job:\n\n"
            "1. Go to 'JobConnect' from the sidebar\n"
            "2. Find a job that matches your skills\n"
            "3. Tap the job card to expand it\n"
            "4. Click the 'Apply' button\n"
            "5. Your verified skills will be shared automatically\n\n"
            "🎯 Having verified skills increases your chances!"
        ),
        "suggestions": ["How to verify skills?", "Back to JobConnect", "View my profile"],
    },
    # ── Profile ──
    {
        "keywords": ["profile", "account", "my page", "edit profile", "trust", "trust score", "badge"],
        "response": (
            "👤 Profile — Your Digital Identity\n\n"
            "In your Profile you can:\n"
            "• View and edit your personal information\n"
            "• See your Trust Score (built by AI)\n"
            "• View AI-verified skill badges (blue = verified)\n"
            "• Get skill recommendations\n\n"
            "To access: Click 'Profile' in the left sidebar."
        ),
        "suggestions": ["How to edit profile?", "What is Trust Score?", "How to verify skills?"],
    },
    {
        "keywords": ["edit", "change name", "update profile", "modify"],
        "response": (
            "To edit your profile:\n\n"
            "1. Click 'Profile' in the sidebar\n"
            "2. Click the 'Edit Profile' button (top right)\n"
            "3. Update your name, location, or other details\n"
            "4. Click 'Save Changes' when done\n\n"
            "✅ Changes are saved instantly!"
        ),
        "suggestions": ["How to verify skills?", "View Trust Score", "Go to JobConnect"],
    },
    # ── Skill Verification ──
    {
        "keywords": ["verify", "verification", "skill", "camera", "proof", "upload", "badge", "certified"],
        "response": (
            "🛡️ Skill Verification — Prove Your Expertise\n\n"
            "How it works:\n"
            "1. Go to 'Profile' from the sidebar\n"
            "2. Click 'Upload proof of work'\n"
            "3. Take a photo/video of your work using your camera\n"
            "4. AI will analyze it and verify your skill\n"
            "5. You'll get a blue verified badge!\n\n"
            "Verified skills = More job opportunities + Higher Trust Score"
        ),
        "suggestions": ["What is Trust Score?", "Find jobs", "Edit my profile"],
    },
    # ── BazaarPulse ──
    {
        "keywords": ["bazaar", "bazaarpulse", "sell", "product", "shop", "market", "vendor", "listing", "inventory", "whatsapp"],
        "response": (
            "🏪 BazaarPulse — Sell Your Products\n\n"
            "For vendors and small sellers:\n"
            "1. Click 'BazaarPulse' in the sidebar\n"
            "2. Upload a photo of your product\n"
            "3. Describe what you sell\n"
            "4. AI creates your product listing instantly\n"
            "5. Share via WhatsApp card with customers\n\n"
            "📦 Your product gets listed in under 30 seconds!"
        ),
        "suggestions": ["How to create a listing?", "View demand forecast", "Track my sales"],
    },
    {
        "keywords": ["demand", "forecast", "trend", "sales", "analytics"],
        "response": (
            "📊 Demand Forecast in BazaarPulse:\n\n"
            "1. Open 'BazaarPulse' from the sidebar\n"
            "2. Look for the 'Demand Forecast' section\n"
            "3. See what products are trending in your area\n"
            "4. Plan your inventory based on AI predictions\n\n"
            "This helps you stock the right products!"
        ),
        "suggestions": ["How to list a product?", "Go to BazaarPulse", "View my profile"],
    },
    # ── GramLens ──
    {
        "keywords": ["gramlens", "gram lens", "map", "district", "cluster", "economic", "official", "panchayat", "village"],
        "response": (
            "🗺️ GramLens — Community Economic Map\n\n"
            "GramLens shows a live map of economic activity:\n"
            "• View clusters of economic activity across districts\n"
            "• See bridge nodes connecting communities\n"
            "• Monitor where support is needed\n"
            "• Track economic velocity of different areas\n\n"
            "To access: Click 'GramLens' in the left sidebar.\n"
            "Best for: Officials, community leaders, and researchers."
        ),
        "suggestions": ["What are bridge nodes?", "View cluster stats", "Back to dashboard"],
    },
    # ── Language ──
    {
        "keywords": ["language", "hindi", "tamil", "kannada", "marathi", "english", "translate", "bhasha"],
        "response": (
            "🌐 Change Language:\n\n"
            "1. Look at the top-right corner of the screen\n"
            "2. Click the globe icon (🌍)\n"
            "3. Select your preferred language:\n"
            "   • English\n"
            "   • हिंदी (Hindi)\n"
            "   • मराठी (Marathi)\n"
            "   • ಕನ್ನಡ (Kannada)\n"
            "   • தமிழ் (Tamil)\n\n"
            "The entire app will switch to your language!"
        ),
        "suggestions": ["How to find jobs?", "Go to profile", "What is GramSphere?"],
    },
    # ── Login / Signup ──
    {
        "keywords": ["login", "signup", "sign up", "register", "google", "account create", "new user"],
        "response": (
            "🔐 Getting Started:\n\n"
            "1. On the landing page, click 'Get Started Free' or 'Sign Up'\n"
            "2. You can also click 'Login' if you already have an account\n"
            "3. Sign in with your Google account\n"
            "4. You'll land on the Dashboard with all features ready!\n\n"
            "It's completely free to use."
        ),
        "suggestions": ["What is JobConnect?", "How to verify skills?", "Change language"],
    },
    # ── Navigation / General ──
    {
        "keywords": ["navigate", "sidebar", "menu", "where", "find", "how to", "use", "dashboard", "home"],
        "response": (
            "🧭 Navigating GramSphere:\n\n"
            "• The sidebar (left side) has all main sections\n"
            "• On mobile, tap the ☰ menu icon (top-left) to open it\n"
            "• Click any section name to switch:\n"
            "  → JobConnect — Find local jobs\n"
            "  → Profile — Your digital identity\n"
            "  → BazaarPulse — Sell products\n"
            "  → GramLens — Community maps\n\n"
            "💡 Use the globe icon (top-right) to change language anytime."
        ),
        "suggestions": ["Tell me about JobConnect", "What is BazaarPulse?", "How to change language?"],
    },
    # ── What is GramSphere ──
    {
        "keywords": ["gramsphere", "about", "what is", "platform", "purpose"],
        "response": (
            "🏠 About GramSphere:\n\n"
            "GramSphere empowers local economies in India (Bharat).\n\n"
            "It helps you:\n"
            "• Find local jobs matching your skills\n"
            "• Verify your skills with AI\n"
            "• Sell products online easily\n"
            "• View economic activity in your community\n\n"
            "Available in 5 languages. Built for Bharat 🇮🇳"
        ),
        "suggestions": ["How to find jobs?", "How to sell products?", "How to verify skills?"],
    },
    # ── Thank you / Bye ──
    {
        "keywords": ["thank", "thanks", "bye", "goodbye", "ok", "okay", "got it", "understood"],
        "response": (
            "You're welcome! 😊\n\n"
            "Feel free to ask me anytime you need help navigating GramSphere. I'm always here!\n\n"
            "Happy exploring! 🚀"
        ),
        "suggestions": ["Find jobs", "View my profile", "Change language"],
    },
]

# Fallback when no match found
FALLBACK_RESPONSE = {
    "response": (
        "I'm not sure I understand that question. 🤔\n\n"
        "I can help you with:\n"
        "• Finding jobs → say 'jobs'\n"
        "• Verifying skills → say 'verify'\n"
        "• Selling products → say 'bazaar'\n"
        "• Community maps → say 'gramlens'\n"
        "• Changing language → say 'language'\n"
        "• Navigation help → say 'navigate'\n\n"
        "Try asking in simpler words!"
    ),
    "suggestions": ["How to find jobs?", "What is GramSphere?", "Help me navigate"],
}


def find_best_match(message: str) -> dict:
    """Find the best matching knowledge base entry using keyword scoring."""
    msg_lower = message.lower().strip()
    # Tokenize the message
    words = set(re.findall(r'[a-zA-Z]+', msg_lower))

    best_match = None
    best_score = 0

    for entry in KNOWLEDGE_BASE:
        score = 0
        for keyword in entry["keywords"]:
            # Exact word match (higher weight)
            if keyword in words:
                score += 3
            # Substring match (lower weight)
            elif keyword in msg_lower:
                score += 2

        if score > best_score:
            best_score = score
            best_match = entry

    if best_score >= 2:
        return best_match
    return FALLBACK_RESPONSE


def translate_text(text: str, target_lang: str) -> str:
    """Translate text using Google Translate (free, fast, no API key)."""
    if target_lang == "en":
        return text

    lang_map = {"hi": "hi", "mr": "mr", "kn": "kn", "ta": "ta"}
    target = lang_map.get(target_lang, "en")

    try:
        translated = GoogleTranslator(source="en", target=target).translate(text)
        return translated or text
    except Exception:
        return text  # Fallback to English on any error


# ── API Models ─────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    language: str = "en"


class ChatResponse(BaseModel):
    reply: str
    suggestions: list[str] = []


@router.post("/chatbot", response_model=ChatResponse)
async def chatbot_endpoint(req: ChatRequest):
    """
    Handle a chatbot message.
    Uses keyword matching (~5ms) + Google Translate (~100ms) for speed.
    """
    # 1. Find matching response from knowledge base
    match = find_best_match(req.message)

    reply = match["response"]
    suggestions = match.get("suggestions", [])

    # 2. Translate if needed (only when not English)
    if req.language != "en":
        reply = translate_text(reply, req.language)
        suggestions = [translate_text(s, req.language) for s in suggestions]

    return ChatResponse(reply=reply, suggestions=suggestions)
