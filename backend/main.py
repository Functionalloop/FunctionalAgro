"""
FunctionalAgro — FastAPI Backend
Main application entry point.
Run: uvicorn backend.main:app --reload --port 8000
"""
import os
from dotenv import load_dotenv

# ✅ Load .env FIRST — before any os.getenv() calls in imported modules
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import google.generativeai as genai

from backend.database import init_db
from backend.routes import diagnose, recommend, advise, outbreak, dalal

app = FastAPI(
    title="FunctionalAgro API",
    description="AI-powered crop disease diagnosis, outbreak radar, and price negotiation for Indian farmers.",
    version="1.0.0",
)

# CORS — allow React dev server + production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve TTS audio files
static_dir = os.path.join(os.path.dirname(__file__), "..", "static", "audio")
os.makedirs(static_dir, exist_ok=True)
app.mount("/audio", StaticFiles(directory=static_dir), name="audio")

# Register routers
app.include_router(diagnose.router, prefix="/api", tags=["Diagnosis"])
app.include_router(recommend.router, prefix="/api", tags=["Crop Recommendation"])
app.include_router(advise.router,    prefix="/api", tags=["Advisory"])
app.include_router(outbreak.router,  prefix="/api", tags=["Outbreak Radar"])
app.include_router(dalal.router,     prefix="/api", tags=["AI Dalal"])


@app.on_event("startup")
async def startup_event():
    init_db()

    # ✅ Configure Gemini once at startup — not per request
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    demo_mode  = os.getenv("DEMO_MODE", "false").lower() == "true"
    if gemini_key:
        genai.configure(api_key=gemini_key)
        print("✅ Gemini API configured.")
    elif demo_mode:
        print("⚠️  DEMO_MODE=true — Gemini calls will use mock responses.")
    else:
        print("⚠️  GEMINI_API_KEY not set. Advisory + Dalal endpoints will error.")

    print(f"✅ FunctionalAgro backend started. DB initialized. Demo mode: {demo_mode}")


@app.get("/", tags=["Health"])
def root():
    demo_mode = os.getenv("DEMO_MODE", "false").lower() == "true"
    return {
        "app": "FunctionalAgro",
        "status": "running",
        "demo_mode": demo_mode,
        "docs": "/docs",
        "endpoints": [
            "POST /api/diagnose",
            "GET  /api/recommend-crop",
            "POST /api/advise",
            "GET  /api/outbreak-check",
            "GET  /api/outbreak-map",
            "POST /api/dalal-negotiate",
        ],
    }
