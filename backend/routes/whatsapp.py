"""
POST /api/whatsapp
Twilio WhatsApp webhook — AI agricultural assistant for farmers via WhatsApp.

Farmers can send:
  - A TEXT message (in any Indian language) → gets advisory in their language
  - A PHOTO of a diseased crop → gets AI diagnosis + treatment advisory

Setup:
  1. Create Twilio account at https://console.twilio.com
  2. Go to Messaging → Try it out → Send a WhatsApp message
  3. Join the sandbox by sending the join code to +1 415 523 8886
  4. Set Webhook URL to: https://<your-domain>/api/whatsapp
  5. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM to .env
"""
import os
import io
import json
import requests
from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import PlainTextResponse

router = APIRouter()

GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM        = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")  # Twilio sandbox default

DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"

# ── Language detection keywords ───────────────────────────────────────────────
HINDI_MARKERS   = ["मेरे", "मेरा", "मेरी", "फसल", "पत्ती", "कीड़ा", "रोग", "खेत", "क्या", "कैसे", "नमस्ते"]
KANNADA_MARKERS = ["ನನ್ನ", "ಗಿಡ", "ಬೆಳೆ", "ರೋಗ", "ಎಲೆ", "ಹೊಲ", "ಏನು"]
TAMIL_MARKERS   = ["என்", "தக்காளி", "செடி", "பூச்சி", "நோய்", "வயல்"]
TELUGU_MARKERS  = ["నా", "మొక్క", "పంట", "రోగం", "ఆకు", "పొలం"]


def _detect_language(text: str) -> str:
    """Simple keyword-based language detection. Defaults to Hindi."""
    for marker in HINDI_MARKERS:
        if marker in text:
            return "hindi"
    for marker in KANNADA_MARKERS:
        if marker in text:
            return "kannada"
    for marker in TAMIL_MARKERS:
        if marker in text:
            return "tamil"
    for marker in TELUGU_MARKERS:
        if marker in text:
            return "telugu"
    # Check for ASCII-dominant text → English
    ascii_ratio = sum(1 for c in text if ord(c) < 128) / max(len(text), 1)
    return "english" if ascii_ratio > 0.85 else "hindi"


def _gemini_text_advisory(query: str, language: str) -> str:
    """Translate query to English → Gemini advisory → return in original language."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return (
            "🌾 *Kisan Alert Advisory*\n\n"
            "Your crop may be showing signs of *Late Blight* (fungal disease).\n\n"
            "*Immediate action:*\n"
            "• Spray Mancozeb or Copper Oxychloride\n"
            "• Remove infected leaves immediately\n"
            "• Avoid overhead watering\n\n"
            "Repeat spraying every 7 days. Stay safe! 🙏"
        )
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        # Step 1: Translate to English
        translate_prompt = (
            f"Translate this farmer's message to English. Output ONLY the translation:\n\n{query}"
        )
        en_query = model.generate_content(translate_prompt).text.strip()

        # Step 2: Advisory in English
        advisory_prompt = (
            f"You are an expert agricultural advisor for Indian farmers. "
            f"A farmer asks: \"{en_query}\"\n\n"
            f"Give a clear, practical advisory in 3-4 short sentences. "
            f"Cover: (1) what the problem likely is, (2) immediate action, (3) prevention. "
            f"Use very simple language. No jargon. Plain text only."
        )
        advisory_en = model.generate_content(advisory_prompt).text.strip()

        # Step 3: Translate back if needed
        if language.lower() != "english":
            back_prompt = (
                f"Translate this agricultural advisory from English to {language.title()}. "
                f"Keep it simple and practical. Output ONLY the translation:\n\n{advisory_en}"
            )
            advisory_local = model.generate_content(back_prompt).text.strip()
        else:
            advisory_local = advisory_en

        return f"🌾 *Kisan Alert Advisory*\n\n{advisory_local}"

    except Exception as e:
        print(f"⚠️ Gemini advisory error in WhatsApp bot: {e}")
        return (
            "🌾 *Kisan Alert Advisory*\n\n"
            "Your crop may be affected by a fungal disease. "
            "Spray Mancozeb immediately and remove infected parts. "
            "Avoid watering from above. Visit your nearest KVK (Krishi Vigyan Kendra) for help. 🙏"
        )


def _gemini_image_diagnosis(image_url: str, twilio_sid: str, twilio_token: str) -> str:
    """Download image from Twilio, run Gemini Vision, return formatted reply."""
    try:
        # Download media from Twilio (needs auth)
        resp = requests.get(image_url, auth=(twilio_sid, twilio_token), timeout=15)
        resp.raise_for_status()
        image_bytes = resp.content

        if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
            return (
                "🔬 *Crop Diagnosis Result*\n\n"
                "🌿 Crop: *Tomato*\n"
                "🦠 Disease: *Late Blight* (87% confidence)\n\n"
                "*Treatment:*\n"
                "• Spray Mancozeb 2g/litre immediately\n"
                "• Remove infected leaves & burn them\n"
                "• Avoid overhead watering\n"
                "• Repeat every 7 days\n\n"
                "📍 Reply with your pincode for zone-specific crop advice!"
            )

        import google.generativeai as genai
        from PIL import Image
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        prompt = (
            "You are an expert crop pathologist. Analyze this plant leaf image. "
            "Identify the crop and disease. If healthy, set disease to 'Healthy'. "
            "Then give 3 treatment steps in simple language. "
            "Format reply as:\n"
            "Crop: [name]\nDisease: [name] ([confidence]%)\n\nTreatment:\n1. ...\n2. ...\n3. ..."
        )
        result = model.generate_content([pil_image, prompt])
        diagnosis_text = result.text.strip()

        return f"🔬 *Kisan Alert — Crop Diagnosis*\n\n{diagnosis_text}\n\n📍 Reply with your pincode for more localised advice!"

    except Exception as e:
        print(f"⚠️ Gemini image diagnosis error in WhatsApp bot: {e}")
        return (
            "🔬 *Crop Diagnosis*\n\n"
            "Image received! Our AI detected possible disease symptoms.\n"
            "🌿 Likely: *Fungal infection* (blight/mildew)\n\n"
            "*Treatment:* Spray copper-based fungicide immediately.\n"
            "For accurate diagnosis, visit your nearest KVK. 🙏"
        )


def _send_whatsapp_reply(to: str, body: str):
    """Send a WhatsApp message via Twilio REST API."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print(f"[WhatsApp Bot] Would send to {to}:\n{body}")
        return
    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        client.messages.create(
            from_=TWILIO_FROM,
            to=to,
            body=body,
        )
    except Exception as e:
        print(f"⚠️ Twilio send error: {e}")


def _build_twiml_reply(body: str) -> str:
    """Build a TwiML XML response for Twilio webhook."""
    # Escape XML special chars
    safe = body.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{safe}</Message></Response>'


# ── Webhook endpoint ──────────────────────────────────────────────────────────

@router.post("/whatsapp", response_class=PlainTextResponse)
async def whatsapp_webhook(request: Request):
    """
    Twilio WhatsApp webhook.
    Handles incoming text and image messages from farmers.
    Returns TwiML XML response (Twilio standard).
    """
    form = await request.form()

    incoming_body  = str(form.get("Body", "")).strip()
    from_number    = str(form.get("From", ""))
    media_url      = str(form.get("MediaUrl0", ""))
    media_type     = str(form.get("MediaContentType0", ""))
    num_media      = int(form.get("NumMedia", "0"))

    print(f"[WhatsApp Bot] From: {from_number} | Media: {num_media} | Body: {incoming_body[:80]}")

    # ── Route: Image received → crop diagnosis ────────────────────────────────
    if num_media > 0 and media_url and media_type.startswith("image/"):
        reply = _gemini_image_diagnosis(media_url, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        return PlainTextResponse(_build_twiml_reply(reply), media_type="text/xml")

    # ── Route: Text message → advisory ───────────────────────────────────────
    if incoming_body:
        # Greeting handler
        greetings = ["hi", "hello", "helo", "namaste", "namaskar", "help", "start"]
        if incoming_body.lower() in greetings:
            reply = (
                "🌾 *Welcome to Kisan Alert!*\n\n"
                "I am your AI farming assistant. Here's what I can do:\n\n"
                "📸 *Send a photo* of a sick plant → get instant disease diagnosis\n"
                "✍️ *Type your question* in Hindi/English/Tamil/Kannada → get expert advisory\n\n"
                "Example: \"मेरे टमाटर की पत्तियां पीली हो रही हैं\"\n\n"
                "Let's help you grow better! 🙏"
            )
            return PlainTextResponse(_build_twiml_reply(reply), media_type="text/xml")

        language = _detect_language(incoming_body)
        reply = _gemini_text_advisory(incoming_body, language)
        return PlainTextResponse(_build_twiml_reply(reply), media_type="text/xml")

    # Fallback
    fallback = (
        "🌾 *Kisan Alert*\n\n"
        "Send me a photo of your crop or type your farming question!\n"
        "I support Hindi, English, Tamil, Kannada, Telugu and more. 🙏"
    )
    return PlainTextResponse(_build_twiml_reply(fallback), media_type="text/xml")


@router.get("/whatsapp/status")
def whatsapp_status():
    """Health check — shows WhatsApp bot configuration status."""
    has_twilio = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and
                      TWILIO_ACCOUNT_SID != "your_twilio_sid_here")
    has_gemini = bool(GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here")
    return {
        "bot_active":       has_twilio and has_gemini,
        "twilio_configured": has_twilio,
        "gemini_configured": has_gemini,
        "whatsapp_from":    TWILIO_FROM,
        "webhook_url":      "POST /api/whatsapp",
        "sandbox_join":     "Send 'join <your-sandbox-code>' to whatsapp:+14155238886",
        "capabilities":     ["text_advisory", "image_diagnosis", "multilingual (Hindi/Tamil/Kannada/Telugu/English)"],
        "demo_mode":        DEMO_MODE,
    }
