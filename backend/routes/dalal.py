"""
POST /api/dalal-negotiate
AI Dalal -- 3 Gemini-powered trader personas bid on the farmer's crop.
Seeded with real Agmarknet prices + transport cost factor.
Cross-checks Outbreak Radar -- warns farmer to sell if disease pressure is high.
"""
import json
import os
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db, Diagnosis

router = APIRouter()

GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")
DEMO_MODE        = os.getenv("DEMO_MODE", "false").lower() == "true"
PRICES_PATH      = os.path.join(os.path.dirname(__file__), "..", "..", "data", "agmarknet_cache.json")
OUTBREAK_THRESH  = int(os.getenv("OUTBREAK_THRESHOLD", "3"))
WINDOW_DAYS      = int(os.getenv("OUTBREAK_WINDOW_DAYS", "7"))

# Gemini model -- lazy loaded
_gemini_model = None

_prices: dict = {}

def _load_prices() -> dict:
    global _prices
    if not _prices:
        with open(PRICES_PATH) as f:
            _prices = json.load(f)
    return _prices


def _get_model():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set in .env")
    try:
        import google.genai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel("gemini-1.5-flash")
    except (ImportError, AttributeError):
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel("gemini-1.5-flash")
    return _gemini_model


# ── Trader persona prompts ────────────────────────────────────────────────────

TRADER_PROMPTS = {
    "Shrewd Ramesh": {
        "emoji": "🤑",
        "style": "low-ball",
        "prompt": """You are Ramesh, a shrewd mandi broker trying to buy {crop} as cheaply as possible.
Current Agmarknet modal price: ₹{modal}/quintal. Minimum market price: ₹{min_price}/quintal.
Transport cost from pincode {pincode} to mandi: ₹{transport}/quintal (deduct this from your offer).
Offer 15–20% BELOW the modal price, accounting for transport. Be persuasive but firm — mention storage risk, market uncertainty.
Reply in exactly 2 sentences: first sentence is your pitch, second states your bid clearly as "My offer: ₹X/quintal".""",
        "bid_modifier": -0.17,   # 17% below modal
    },
    "Fair Suresh": {
        "emoji": "🤝",
        "style": "fair",
        "prompt": """You are Suresh from the local farmers' cooperative, offering a fair price for {crop}.
Current Agmarknet modal price: ₹{modal}/quintal.
Offer within 5% of modal price. Emphasize timely payment within 3 days and no hidden deductions.
Reply in exactly 2 sentences: first sentence is your pitch, second states your bid clearly as "My offer: ₹X/quintal".""",
        "bid_modifier": 0.02,    # 2% above modal
    },
    "Premium Vikram": {
        "emoji": "💎",
        "style": "premium",
        "prompt": """You are Vikram, a procurement manager from a premium food export company buying {crop} for processing and export.
Current Agmarknet modal price: ₹{modal}/quintal. Maximum market price: ₹{max_price}/quintal.
Offer 10–15% ABOVE the modal price — you pay premium for quality and offer direct farm pickup (no transport cost for farmer).
Reply in exactly 2 sentences: first sentence is your pitch, second states your bid clearly as "My offer: ₹X/quintal".""",
        "bid_modifier": 0.12,    # 12% above modal
    },
}


def _estimate_transport_cost(pincode: str) -> int:
    """Rough transport cost estimate based on pincode region (₹/quintal)."""
    prefix = int(pincode[:2])
    if prefix in range(11, 14):   # Delhi/UP
        return 120
    if prefix in range(40, 45):   # Maharashtra
        return 150
    if prefix in range(56, 58):   # Karnataka
        return 100
    if prefix in range(60, 64):   # Tamil Nadu
        return 130
    return 140  # Default


def _check_outbreak(pincode: str, crop: str, db: Session) -> bool:
    """Returns True if there's an active outbreak for this crop/pincode."""
    cutoff = datetime.utcnow() - timedelta(days=WINDOW_DAYS)
    count = (
        db.query(func.count(Diagnosis.id))
        .filter(
            Diagnosis.pincode == pincode,
            Diagnosis.crop == crop,
            Diagnosis.timestamp >= cutoff,
        )
        .scalar()
    )
    return (count or 0) >= OUTBREAK_THRESH


def _call_trader(model, name: str, config: dict, crop: str, prices: dict,
                 pincode: str, qty: int) -> dict:
    """Call Gemini for one trader persona. Returns bid dict."""
    modal = prices.get("modal", 2000)
    min_p = prices.get("min", 1200)
    max_p = prices.get("max", 2800)
    transport = _estimate_transport_cost(pincode)

    prompt = config["prompt"].format(
        crop=crop,
        modal=modal,
        min_price=min_p,
        max_price=max_p,
        pincode=pincode,
        transport=transport,
    )

    expected_bid = int(modal * (1 + config["bid_modifier"]))

    try:
        response = model.generate_content(prompt)
        message = response.text.strip()
    except Exception:
        message = f"I can offer ₹{expected_bid}/quintal for your {crop}. My offer: ₹{expected_bid}/quintal"

    return {
        "trader": name,
        "emoji": config["emoji"],
        "style": config["style"],
        "bid": expected_bid,
        "bid_per_quintal": expected_bid,
        "total_value": expected_bid * qty,
        "message": message,
    }


# ── Endpoint ──────────────────────────────────────────────────────────────────

class DalalRequest(BaseModel):
    crop: str
    qty_quintal: int = 10
    pincode: str = "560001"


@router.post("/dalal-negotiate")
def dalal_negotiate(req: DalalRequest, db: Session = Depends(get_db)):
    """
    3 AI trader personas bid on the farmer's crop.
    Seeded with Agmarknet prices. Warns if Outbreak Radar shows disease pressure nearby.
    """
    prices_data = _load_prices()

    # Find prices for this pincode (fallback to first available)
    pincode_prices = prices_data.get(req.pincode) or list(prices_data.values())[0]
    crop_prices = pincode_prices.get(req.crop)

    if not crop_prices:
        # Find nearest crop alphabetically as fallback
        crop_prices = list(pincode_prices.values())[0]

    model = _get_model() if not DEMO_MODE else None

    bids = []
    for name, config in TRADER_PROMPTS.items():
        if DEMO_MODE:
            # Demo mode: skip Gemini, use calculated bids only
            modal = crop_prices.get("modal", 2000)
            expected_bid = int(modal * (1 + config["bid_modifier"]))
            transport = _estimate_transport_cost(req.pincode)
            demo_messages = {
                "Shrewd Ramesh": f"With transport costs of ₹{transport}/quintal and storage risk this season, I can only go to ₹{expected_bid}. My offer: ₹{expected_bid}/quintal",
                "Fair Suresh":   f"Our cooperative offers fair payment within 3 days, no hidden deductions, aligned with today's market. My offer: ₹{expected_bid}/quintal",
                "Premium Vikram": f"We source directly from farms for our export line and pay a quality premium with free pickup from your location. My offer: ₹{expected_bid}/quintal",
            }
            bids.append({
                "trader": name, "emoji": config["emoji"], "style": config["style"],
                "bid": expected_bid, "bid_per_quintal": expected_bid,
                "total_value": expected_bid * req.qty_quintal,
                "message": demo_messages[name],
            })
        else:
            bid = _call_trader(model, name, config, req.crop, crop_prices, req.pincode, req.qty_quintal)
            bids.append(bid)

    # Sort bids high → low
    bids.sort(key=lambda x: x["bid"], reverse=True)
    best = bids[0]

    # Cross-check Outbreak Radar
    outbreak_active = _check_outbreak(req.pincode, req.crop, db)
    outbreak_warning = None
    if outbreak_active:
        outbreak_warning = (
            f"⚠️ Disease outbreak detected for {req.crop} near pincode {req.pincode}. "
            "Market prices may fall as supply increases. Consider accepting the best offer now."
        )

    recommendation = f"Accept {best['trader']}'s offer — best net price for your {req.crop}."
    if outbreak_active:
        recommendation += " Sell now — disease pressure may reduce prices next week."

    return {
        "crop": req.crop,
        "qty_quintal": req.qty_quintal,
        "pincode": req.pincode,
        "market_modal_price": crop_prices.get("modal"),
        "bids": bids,
        "best_bid": best["bid"],
        "best_trader": best["trader"],
        "best_total_value": best["total_value"],
        "recommendation": recommendation,
        "outbreak_warning": outbreak_warning,
        "outbreak_active": outbreak_active,
    }
