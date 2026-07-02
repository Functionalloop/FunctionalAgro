"""
Language layer — Bhashini translation + TTS (gTTS fallback).
Primary: Bhashini Dhruva API (government infra, strong for judging)
Fallback: deep-translator (Google Translate) + gTTS
"""
import os
import uuid
import requests
from gtts import gTTS
from deep_translator import GoogleTranslator

BHASHINI_API_KEY   = os.getenv("BHASHINI_API_KEY", "")
BHASHINI_USER_ID   = os.getenv("BHASHINI_USER_ID", "")
BHASHINI_BASE_URL  = "https://dhruva-api.bhashini.gov.in"
BHASHINI_PIPELINE  = f"{BHASHINI_BASE_URL}/services/inference/pipeline"

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

# Bhashini language codes
LANG_CODES = {
    "hindi":   "hi",
    "tamil":   "ta",
    "telugu":  "te",
    "kannada": "kn",
    "marathi": "mr",
    "bengali": "bn",
    "punjabi": "pa",
    "english": "en",
}

# gTTS language codes
GTTS_CODES = {
    "hi": "hi", "ta": "ta", "te": "te", "kn": "kn",
    "mr": "mr", "bn": "bn", "pa": "pa", "en": "en",
}


def _bhashini_translate(text: str, source_lang: str, target_lang: str) -> str | None:
    """Call Bhashini Dhruva translation pipeline. Returns None on failure."""
    if not BHASHINI_API_KEY or not BHASHINI_USER_ID:
        return None
    try:
        payload = {
            "pipelineTasks": [{
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": target_lang,
                    }
                }
            }],
            "inputData": {
                "input": [{"source": text}]
            }
        }
        headers = {
            "Authorization": BHASHINI_API_KEY,
            "userID": BHASHINI_USER_ID,
            "Content-Type": "application/json",
        }
        resp = requests.post(BHASHINI_PIPELINE, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data["pipelineResponse"][0]["output"][0]["target"]
    except Exception:
        return None


def translate(text: str, target_language: str) -> str:
    """
    Translate text to target_language.
    Target language: 'hindi', 'tamil', 'telugu', 'kannada', 'marathi', 'bengali', 'english'
    """
    lang_code = LANG_CODES.get(target_language.lower(), "en")
    if lang_code == "en":
        return text  # No translation needed

    # Try Bhashini first
    result = _bhashini_translate(text, "en", lang_code)
    if result:
        return result

    # Fallback: Google Translate via deep-translator
    try:
        return GoogleTranslator(source="en", target=lang_code).translate(text)
    except Exception:
        return text  # Last resort: return original


def text_to_speech(text: str, language: str) -> str | None:
    """
    Convert text to speech. Returns relative URL to audio file, or None on failure.
    Uses gTTS (works offline once loaded, no API key needed).
    """
    lang_code = LANG_CODES.get(language.lower(), "en")
    try:
        filename = f"{uuid.uuid4().hex}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        tts = gTTS(text=text, lang=lang_code, slow=False)
        tts.save(filepath)
        return f"/audio/{filename}"
    except Exception:
        return None
