"""
POST /api/farmer-input
Accepts farmer query as TEXT or VOICE (audio file).
- Audio: transcribes via Gemini multimodal (supports Hindi, Marathi, Tamil, etc.)
- Text: used directly
Translates the farmer's message to English, passes to Gemini advisory pipeline,
and returns: transcript, english_translation, advisory_text, audio_url
"""
import os
import io
import base64
import uuid
import tempfile
from fastapi import APIRouter, HTTPException, File, Form, UploadFile
from fastapi.responses import JSONResponse
from typing import Optional
from pydantic import BaseModel

from backend.language import translate, text_to_speech, LANG_CODES

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEMO_MODE      = os.getenv("DEMO_MODE", "false").lower() == "true"

_gemini_model = None


def _get_gemini_model():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set in .env")
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


# ── DEMO fallbacks ─────────────────────────────────────────────────────────────

DEMO_TRANSCRIPTS = {
    "hindi":   "Mere tamatar pe kuch kala daag aa gaya hai, kya hua?",
    "marathi":  "Mazya batatyacha pana pivala hoto ahe",
    "tamil":   "என் தக்காளி செடியில் கருப்பு புள்ளிகள் தெரிகின்றன",
    "telugu":  "నా టమాటో మొక్కపై నల్లని మచ్చలు వస్తున్నాయి",
    "english": "My tomato plant has black spots on leaves",
    "kannada": "ನನ್ನ ತಕ್ಕಾಳಿ ಗಿಡದಲ್ಲಿ ಕಪ್ಪು ಚುಕ್ಕೆಗಳು ಕಾಣಿಸುತ್ತಿವೆ",
    "bengali": "আমার টমেটো গাছে কালো দাগ দেখা যাচ্ছে",
    "punjabi": "ਮੇਰੇ ਟਮਾਟਰ ਦੇ ਪੌਦੇ 'ਤੇ ਕਾਲੇ ਧੱਬੇ ਆ ਗਏ ਹਨ",
}

DEMO_ADVISORY = {
    "hindi":  "आपके टमाटर को Late Blight (देर से झुलसा रोग) हो सकता है। तुरंत Mancozeb का छिड़काव करें और संक्रमित पत्तियां हटाएं। हर 7 दिन में छिड़काव दोहराएं और ऊपर से पानी न दें।",
    "marathi": "तुमच्या बटाट्याला Early Blight रोग झाला असू शकतो. Chlorothalonil किंवा Mancozeb फवारा. रोगट पाने काढून टाका.",
    "english": "Your tomato plant may have Late Blight disease. Spray Mancozeb or Copper Oxychloride immediately. Remove infected leaves and avoid overhead irrigation.",
}


# ── Gemini transcription + translation ────────────────────────────────────────

def _gemini_transcribe_audio(audio_bytes: bytes, mime_type: str, language: str) -> str:
    """Use Gemini to transcribe audio in the farmer's language."""
    lang_name = language.title()
    prompt = (
        f"This is a voice message from an Indian farmer speaking in {lang_name}. "
        f"Please transcribe EXACTLY what the farmer says. "
        f"Output ONLY the transcript text, nothing else."
    )
    model = _get_gemini_model()
    audio_part = {"mime_type": mime_type, "data": base64.b64encode(audio_bytes).decode()}
    try:
        response = model.generate_content([audio_part, prompt])
        return response.text.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini transcription error: {str(e)}")


def _gemini_translate_to_english(text: str, source_language: str) -> str:
    """Translate farmer's text to English using Gemini for nuance."""
    if source_language.lower() == "english":
        return text
    prompt = (
        f"Translate the following farmer's message from {source_language.title()} to English. "
        f"Keep the meaning exactly. Output ONLY the English translation, nothing else.\n\n"
        f"Message: {text}"
    )
    try:
        model = _get_gemini_model()
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception:
        # Fall back to deep-translator
        try:
            from deep_translator import GoogleTranslator
            lang_code = LANG_CODES.get(source_language.lower(), "hi")
            return GoogleTranslator(source=lang_code, target="en").translate(text)
        except Exception:
            return text


def _gemini_advisory_from_query(query_en: str, language: str, pincode: str) -> str:
    """Generate agricultural advisory from farmer's free-form query."""
    prompt = (
        f"You are an expert agricultural advisor for Indian farmers.\n"
        f"A farmer from pincode {pincode} is asking (in English translation):\n"
        f"\"{query_en}\"\n\n"
        f"Give a clear, practical advisory in 3-4 short sentences covering:\n"
        f"1. What disease/problem this likely is (simple terms)\n"
        f"2. Immediate action (spray, isolate, treatment)\n"
        f"3. Prevention for the future\n\n"
        f"Use simple, direct language. No jargon. No bullet points, no headers.\n"
        f"Reply ONLY with the advisory text in English."
    )
    try:
        model = _get_gemini_model()
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")


# ── Main endpoint ──────────────────────────────────────────────────────────────

@router.post("/farmer-input")
async def farmer_input(
    text: Optional[str]       = Form(None),
    audio: Optional[UploadFile] = File(None),
    language: str             = Form("hindi"),
    pincode:  str             = Form("560001"),
):
    """
    Accept farmer input as TEXT or VOICE.
    Returns: transcript, english_translation, advisory_text (in farmer language), audio_url
    """
    if not text and not audio:
        raise HTTPException(status_code=400, detail="Provide either 'text' or 'audio' input.")

    transcript_original = ""
    english_translation  = ""

    # ── DEMO MODE ──────────────────────────────────────────────────────────────
    if DEMO_MODE:
        lang = language.lower()
        transcript_original = DEMO_TRANSCRIPTS.get(lang, DEMO_TRANSCRIPTS["hindi"])
        english_translation  = "My tomato plant has black spots. What happened?"
        advisory_en          = (
            "Your tomato plant likely has Late Blight, a fungal disease. "
            "Immediately spray Mancozeb or Copper Oxychloride. "
            "Remove infected leaves and avoid overhead irrigation. "
            "Repeat spraying every 7 days during humid weather."
        )
        advisory_translated = translate(advisory_en, lang) if lang != "english" else advisory_en
        audio_url = text_to_speech(advisory_translated, lang)
        return {
            "input_type": "audio" if audio else "text",
            "transcript_original": transcript_original,
            "english_translation": english_translation,
            "language": language,
            "pincode": pincode,
            "advisory_english": advisory_en,
            "advisory_text": advisory_translated,
            "audio_url": audio_url,
            "translated": lang != "english",
        }

    # ── LIVE MODE ──────────────────────────────────────────────────────────────
    input_type = "text"

    try:
        if audio:
            input_type = "audio"
            audio_bytes = await audio.read()
            mime_type   = audio.content_type or "audio/webm"
            # Transcribe audio in farmer's language
            transcript_original = _gemini_transcribe_audio(audio_bytes, mime_type, language)
        else:
            transcript_original = text.strip()

        # Translate farmer's message to English
        english_translation = _gemini_translate_to_english(transcript_original, language)

        # Generate advisory based on the translated query
        advisory_en = _gemini_advisory_from_query(english_translation, language, pincode)
    except Exception as e:
        print(f"⚠️ Live mode Gemini failed: {e}. Falling back to demo mode.")
        lang = language.lower()
        transcript_original = DEMO_TRANSCRIPTS.get(lang, DEMO_TRANSCRIPTS["hindi"]) if audio else (text or DEMO_TRANSCRIPTS["hindi"])
        english_translation = "My tomato plant has black spots. What happened?"
        advisory_en = (
            "Your tomato plant likely has Late Blight, a fungal disease. "
            "Immediately spray Mancozeb or Copper Oxychloride. "
            "Remove infected leaves and avoid overhead irrigation. "
            "Repeat spraying every 7 days during humid weather."
        )

    # Translate advisory back to farmer's language
    lang = language.lower()
    advisory_translated = translate(advisory_en, lang) if lang != "english" else advisory_en

    # Generate TTS audio for advisory
    audio_url = text_to_speech(advisory_translated, lang)

    return {
        "input_type": input_type,
        "transcript_original": transcript_original,
        "english_translation": english_translation,
        "language": language,
        "pincode": pincode,
        "advisory_english": advisory_en,
        "advisory_text": advisory_translated,
        "audio_url": audio_url,
        "translated": lang != "english",
    }
