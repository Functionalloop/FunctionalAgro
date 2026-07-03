"""
POST /api/advise
Accepts crop + disease + language + pincode -> Gemini advisory -> Bhashini translation -> gTTS audio.
"""
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import requests

from backend.language import translate, text_to_speech

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEMO_MODE      = os.getenv("DEMO_MODE", "false").lower() == "true"
ZONE_PATH      = os.path.join(os.path.dirname(__file__), "..", "..", "data", "pincode_zone_crops.json")

# Lazy-loaded Gemini model
_gemini_model = None

def _get_gemini_model():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set in .env")
    # Try old SDK first, fall back to new SDK
    try:
        import google.generativeai as genai  # Try old SDK first since code assumes it
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel("gemini-1.5-flash")
    except ImportError:
        try:
            import google.genai as genai
            _gemini_model = genai.Client(api_key=GEMINI_API_KEY)
        except ImportError:
            raise HTTPException(status_code=500, detail="No Gemini SDK found")
    return _gemini_model


class AdviseRequest(BaseModel):
    crop: str
    disease: str
    language: str = "english"
    pincode: str = "560001"


ADVISORY_PROMPT = """
You are an expert agricultural advisor helping a small-scale Indian farmer.

The farmer's crop has been diagnosed with the following:
- Crop: {crop}
- Disease: {disease}
- Location pincode: {pincode}
- Upcoming 3-Day Weather: {weather}

Provide clear, practical advisory in 3–4 short sentences covering:
1. What this disease is (in simple terms)
2. Immediate action the farmer should take (spray, isolate, etc.)
3. Preventive measures for the future. VERY IMPORTANT: Base your advice on the weather (e.g., if it will rain, tell them to delay spraying or use stickers).

Use simple, direct language — the farmer may have limited education. Do NOT use technical jargon.
Reply only with the advisory text, no headers or bullet points.
"""

_zone_data = {}
def _load_zones():
    global _zone_data
    if not _zone_data and os.path.exists(ZONE_PATH):
        with open(ZONE_PATH) as f:
            _zone_data = json.load(f)
    return _zone_data

def _get_weather_forecast(pincode: str) -> str:
    """Fetches a 3-day weather summary using free Open-Meteo API."""
    zones = _load_zones()
    data = zones.get(pincode) or zones.get(pincode[:3] + "000") # fuzzy fallback
    if not data:
        return "Unknown weather"
    
    lat, lng = data.get("lat"), data.get("lng")
    if not lat or not lng:
        return "Unknown weather"

    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&daily=weathercode&timezone=auto&forecast_days=3"
        resp = requests.get(url, timeout=3)
        if resp.status_code == 200:
            codes = resp.json().get("daily", {}).get("weathercode", [])
            # Simple WMO mapping: 0-3 clear/cloudy, 45+ rain/fog/snow
            has_rain = any(c >= 51 for c in codes)
            if has_rain:
                return "Rain expected in the next 3 days."
            else:
                return "Clear or mostly cloudy, no significant rain expected."
    except Exception as e:
        print(f"Weather API error: {e}")
    return "Unknown weather"


@router.post("/advise")
def advise(req: AdviseRequest):
    """
    Generates Gemini-powered disease advisory, then translates to farmer's language via Bhashini.
    Returns advisory text + audio URL.
    """
    if req.disease.lower() == "healthy":
        advisory_en = (
            f"Great news! Your {req.crop} plant appears healthy. "
            "Continue regular watering and fertilization. "
            "Check plants weekly for early signs of disease. "
            "Maintain good field hygiene to prevent future infections."
        )
    elif DEMO_MODE:
        # Demo mode: skip Gemini call, return canned response for reliable judging
        advisory_en = (
            f"{req.crop} {req.disease} is a fungal infection that spreads rapidly in humid conditions. "
            "Immediately remove and destroy infected leaves, then spray with Mancozeb or Copper Oxychloride. "
            "Avoid overhead irrigation and maintain proper plant spacing. "
            "Apply preventive fungicide every 10 days during the monsoon season."
        )
    else:
        model = _get_gemini_model()
        weather_desc = _get_weather_forecast(req.pincode)
        prompt = ADVISORY_PROMPT.format(
            crop=req.crop,
            disease=req.disease,
            pincode=req.pincode,
            weather=weather_desc,
        )
        try:
            if hasattr(model, "models"):  # New SDK
                response = model.models.generate_content(model="gemini-1.5-flash", contents=prompt)
            else: # Old SDK
                response = model.generate_content(prompt)
            advisory_en = response.text.strip()
        except Exception as e:
            print(f"⚠️ Gemini API error in advise: {e}. Falling back to demo mode.")
            advisory_en = (
                f"{req.crop} {req.disease} is a fungal infection that spreads rapidly in humid conditions. "
                "Immediately remove and destroy infected leaves, then spray with Mancozeb or Copper Oxychloride. "
                "Avoid overhead irrigation and maintain proper plant spacing. "
                "Apply preventive fungicide every 10 days during the monsoon season."
            )

    # Translate if not English
    lang = req.language.lower()
    advisory_translated = translate(advisory_en, lang) if lang != "english" else advisory_en

    # Generate TTS audio
    audio_url = text_to_speech(advisory_translated, lang)

    return {
        "crop": req.crop,
        "disease": req.disease,
        "language": req.language,
        "advisory_english": advisory_en,
        "advisory_text": advisory_translated,
        "audio_url": audio_url,
        "translated": lang != "english",
    }
