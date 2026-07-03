"""
Kisan Alert — FastAPI Backend
Main application entry point.
Run: python -m uvicorn backend.main:app --reload --port 8000
"""
import os
import sys
from dotenv import load_dotenv

# Load .env FIRST — before any os.getenv() calls in imported modules
load_dotenv()

# Force UTF-8 output on Windows so emoji in print() don't crash
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import init_db
from backend.routes import diagnose, recommend, advise, outbreak, dalal, farmer_input, live_prices, alerts
import asyncio
from backend.tasks.price_monitor import monitor_prices_loop

app = FastAPI(
    title="Kisan Alert API",
    description="AI crop disease diagnosis, outbreak radar, and price negotiation for Indian farmers.",
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
app.include_router(dalal.router,         prefix="/api", tags=["AI Dalal"])
app.include_router(farmer_input.router,  prefix="/api", tags=["Farmer Input"])
app.include_router(live_prices.router,   prefix="/api", tags=["Live Prices"])
app.include_router(alerts.router,        prefix="/api", tags=["Alerts"])


def _configure_gemini():
    """Configure Gemini once at startup. Returns the client or None."""
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    demo_mode  = os.getenv("DEMO_MODE", "false").lower() == "true"

    if not gemini_key or gemini_key == "your_gemini_api_key_here":
        if demo_mode:
            print("[INFO] DEMO_MODE=true -- Gemini calls will use mock responses.")
        else:
            print("[WARN] GEMINI_API_KEY not set. Advisory + Dalal endpoints will return errors.")
        return None

    try:
        from google import genai
        client = genai.Client(api_key=gemini_key)
        print("[OK] Gemini API configured via google.genai (new SDK).")
        return client
    except Exception as e:
        print(f"[WARN] Could not configure Gemini: {e}")
        return None


@app.on_event("startup")
async def startup_event():
    init_db()
    
    # Auto-seed the database for the live demo if empty
    try:
        from backend.database import SessionLocal, Diagnosis
        from data.seed_diagnoses import seed
        db = SessionLocal()
        if db.query(Diagnosis).count() == 0:
            print("[INFO] Database is empty. Seeding Outbreak Radar for demo...")
            seed()
        db.close()
    except Exception as e:
        print(f"[WARN] Could not seed database: {e}")

    _configure_gemini()
    demo_mode = os.getenv("DEMO_MODE", "false").lower() == "true"
    print(f"[OK] FunctionalAgro backend started. Demo mode: {demo_mode}")
    # Start the price monitor background task
    asyncio.create_task(monitor_prices_loop())


@app.get("/", tags=["Health"])
def root():
    demo_mode = os.getenv("DEMO_MODE", "false").lower() == "true"
    return {
        "app": "Kisan Alert",
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
            "POST /api/farmer-input",
            "GET  /api/live-prices",
            "GET  /api/live-prices/refresh",
            "GET  /api/live-prices/summary",
        ],
    }
