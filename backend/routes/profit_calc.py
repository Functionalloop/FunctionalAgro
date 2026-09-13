"""
POST /api/profit-calc
MSP vs Dalal vs Market — Net Profit Calculator for Indian Farmers.

Compares three selling channels:
  1. Government MSP procurement (guaranteed minimum, if applicable)
  2. AI Dalal best bid (Premium Vikram persona = highest private buyer)
  3. Agmarknet modal price (raw market rate, no negotiation)

Returns per-acre and total revenue + net profit for each channel.
Data source: CACP 2024-25 MSP + Agmarknet + Dalal engine.
"""
import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

MSP_PATH    = os.path.join(os.path.dirname(__file__), "..", "..", "data", "msp_data.json")
PRICES_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "agmarknet_cache.json")

_msp_data:    dict = {}
_prices_data: dict = {}

DALAL_PREMIUM_MODIFIER = 0.12   # Premium Vikram always 12% above modal


def _load_msp() -> dict:
    global _msp_data
    if not _msp_data:
        with open(MSP_PATH, encoding="utf-8") as f:
            _msp_data = json.load(f)
    return _msp_data


def _load_prices() -> dict:
    global _prices_data
    if not _prices_data:
        with open(PRICES_PATH, encoding="utf-8") as f:
            _prices_data = json.load(f)
    return _prices_data


def _get_modal_price(crop: str, pincode: str) -> Optional[float]:
    """Look up Agmarknet modal price for crop at pincode (with fuzzy prefix fallback)."""
    prices = _load_prices()
    pincode_data = prices.get(pincode)
    if not pincode_data:
        # Fuzzy: first matching prefix
        prefix = pincode[:3]
        for p, d in prices.items():
            if p.startswith(prefix):
                pincode_data = d
                break
    if not pincode_data:
        # Last resort: first entry
        pincode_data = list(prices.values())[0]
    crop_data = pincode_data.get(crop) or list(pincode_data.values())[0]
    return crop_data.get("modal")


# ── Request / Response ────────────────────────────────────────────────────────

class ProfitCalcRequest(BaseModel):
    crop: str
    area_acres: float = 1.0
    yield_per_acre: Optional[float] = None   # quintals/acre; uses default if not provided
    pincode: str = "560001"


@router.post("/profit-calc")
def profit_calc(req: ProfitCalcRequest):
    """
    Compares Government MSP vs AI Dalal best bid vs Agmarknet modal price.
    Returns per-acre and total revenue, net profit, and a recommendation.
    """
    msp_db  = _load_msp()
    crop_msp = msp_db.get(req.crop)

    if not crop_msp:
        available = [k for k in msp_db if not k.startswith("_")]
        raise HTTPException(
            status_code=404,
            detail=f"Crop '{req.crop}' not found. Available: {available}"
        )

    # ── Yield ─────────────────────────────────────────────────────────────────
    yield_per_acre = req.yield_per_acre or crop_msp["default_yield_per_acre"]
    total_yield_quintals = round(yield_per_acre * req.area_acres, 2)

    # ── Input cost ────────────────────────────────────────────────────────────
    input_cost_per_quintal = crop_msp["input_cost_per_quintal"]
    total_input_cost = round(input_cost_per_quintal * total_yield_quintals, 2)

    # ── Modal (market) price ──────────────────────────────────────────────────
    modal_price = _get_modal_price(req.crop, req.pincode)

    # ── Dalal best bid (Premium Vikram = 12% above modal) ────────────────────
    dalal_price = round(modal_price * (1 + DALAL_PREMIUM_MODIFIER))

    # ── MSP ───────────────────────────────────────────────────────────────────
    msp_price = crop_msp.get("msp_price")
    has_msp   = crop_msp.get("has_msp", False)

    def _channel(price_per_quintal, label, emoji, note=""):
        if price_per_quintal is None:
            return None
        gross   = round(price_per_quintal * total_yield_quintals, 2)
        net     = round(gross - total_input_cost, 2)
        per_acre_gross = round(price_per_quintal * yield_per_acre, 2)
        per_acre_net   = round(per_acre_gross - (input_cost_per_quintal * yield_per_acre), 2)
        return {
            "label":             label,
            "emoji":             emoji,
            "price_per_quintal": price_per_quintal,
            "gross_revenue":     gross,
            "net_profit":        net,
            "per_acre_gross":    per_acre_gross,
            "per_acre_net":      per_acre_net,
            "note":              note,
            "profitable":        net > 0,
        }

    channels = {
        "msp":    _channel(msp_price, "Government MSP", "🏛️", crop_msp.get("procurement_note", "")),
        "dalal":  _channel(dalal_price, "AI Dalal (Premium Vikram)", "💎", "Best private buyer offer via AI negotiation"),
        "market": _channel(modal_price, "Open Market (Modal)", "📊", "Raw Agmarknet modal price, no negotiation"),
    }

    # Filter out None channels (non-MSP crops)
    active_channels = {k: v for k, v in channels.items() if v is not None}

    # ── Best channel ──────────────────────────────────────────────────────────
    best_key  = max(active_channels, key=lambda k: active_channels[k]["net_profit"])
    best      = active_channels[best_key]

    # ── Recommendation ────────────────────────────────────────────────────────
    if best_key == "msp" and has_msp:
        recommendation = (
            f"Sell to government MSP procurement — guaranteed ₹{msp_price}/quintal. "
            f"Contact your nearest FCI/NAFED center. Net profit: ₹{best['net_profit']:,.0f}."
        )
    elif best_key == "dalal":
        recommendation = (
            f"AI Dalal's Premium Vikram gives the best return at ₹{dalal_price}/quintal — "
            f"12% above market. Total net profit: ₹{best['net_profit']:,.0f}. "
            f"Use AI Dalal to negotiate directly."
        )
    else:
        recommendation = (
            f"Market modal price of ₹{modal_price}/quintal is your best option. "
            f"Net profit: ₹{best['net_profit']:,.0f}. Consider negotiating upward via AI Dalal."
        )

    return {
        "crop":                  req.crop,
        "area_acres":            req.area_acres,
        "yield_per_acre":        yield_per_acre,
        "total_yield_quintals":  total_yield_quintals,
        "total_input_cost":      total_input_cost,
        "input_cost_per_quintal": input_cost_per_quintal,
        "has_msp":               has_msp,
        "msp_season":            crop_msp.get("msp_season"),
        "yield_range":           crop_msp.get("yield_range"),
        "channels":              active_channels,
        "best_channel":          best_key,
        "best_net_profit":       best["net_profit"],
        "best_price_per_quintal": best["price_per_quintal"],
        "recommendation":        recommendation,
        "data_source":           "CACP India MSP 2024-25 + Agmarknet live prices",
    }
