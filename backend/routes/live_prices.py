"""
GET /api/live-prices?commodity=Tomato&pincode=560001
Returns today's market price from Agmarknet cache + optional live refresh.

GET /api/live-prices/refresh
Triggers a live scrape of Agmarknet and updates the cache.
"""
import json
import os
import subprocess
import sys
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

router = APIRouter()

PRICES_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "agmarknet_cache.json")
FETCH_SCRIPT = os.path.join(os.path.dirname(__file__), "..", "..", "data", "fetch_live_prices.py")

_prices_cache: dict = {}
_last_loaded: datetime | None = None


def _load_prices(force: bool = False) -> dict:
    global _prices_cache, _last_loaded
    if not _prices_cache or force:
        try:
            with open(PRICES_PATH) as f:
                _prices_cache = json.load(f)
            _last_loaded = datetime.now()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not load price data: {e}")
    return _prices_cache


def _pincode_to_state(pincode: str) -> str:
    mapping = {
        "560": "Karnataka", "561": "Karnataka", "562": "Karnataka",
        "400": "Maharashtra", "410": "Maharashtra", "411": "Maharashtra", "412": "Maharashtra",
        "110": "Delhi", "111": "Delhi",
        "500": "Andhra Pradesh", "501": "Andhra Pradesh", "502": "Andhra Pradesh",
        "600": "Tamil Nadu", "601": "Tamil Nadu", "641": "Tamil Nadu",
        "302": "Rajasthan", "303": "Rajasthan",
        "380": "Gujarat", "395": "Gujarat",
        "226": "Uttar Pradesh", "201": "Uttar Pradesh",
        "141": "Punjab", "143": "Punjab",
    }
    prefix3 = pincode[:3]
    prefix2 = pincode[:2]
    return mapping.get(prefix3) or mapping.get(prefix2) or "India"


def _find_nearest_pincode(pincode: str, prices: dict) -> str:
    """Find nearest pincode in cache or default to first."""
    if pincode in prices:
        return pincode
    # Try same state by prefix
    prefix = pincode[:2]
    for p in prices:
        if p.startswith(prefix):
            return p
    return list(prices.keys())[0]


@router.get("/live-prices")
def get_live_prices(
    commodity: str = Query(None, description="Crop name e.g. Tomato"),
    pincode: str = Query("560001", description="6-digit pincode"),
):
    """
    Returns market prices for a commodity at a given pincode.
    Data sourced from Agmarknet government portal (cached daily).
    """
    prices = _load_prices()
    nearest = _find_nearest_pincode(pincode, prices)
    pincode_data = prices.get(nearest, {})

    last_updated = None
    try:
        # Get date from any entry
        sample_entry = next(iter(pincode_data.values()), {})
        last_updated = sample_entry.get("date")
    except Exception:
        pass

    if commodity:
        # Single commodity
        crop_data = pincode_data.get(commodity)
        if not crop_data:
            # Try case-insensitive match
            for k, v in pincode_data.items():
                if k.lower() == commodity.lower():
                    crop_data = v
                    break

        if not crop_data:
            raise HTTPException(
                status_code=404,
                detail=f"No price data for {commodity} at pincode {pincode}. Available: {list(pincode_data.keys())}",
            )

        return {
            "commodity": commodity,
            "pincode": pincode,
            "pincode_used": nearest,
            "state": crop_data.get("state", _pincode_to_state(pincode)),
            "min_price": crop_data["min"],
            "max_price": crop_data["max"],
            "modal_price": crop_data["modal"],
            "unit": crop_data.get("unit", "quintal"),
            "date": crop_data.get("date", last_updated),
            "source": crop_data.get("source", "agmarknet_cache"),
            "source_label": "🟢 Agmarknet Live" if "live" in crop_data.get("source", "") else "🟡 Cached Data",
            "data_attribution": "Source: Agmarknet — Ministry of Agriculture & Farmers Welfare, Govt. of India",
        }
    else:
        # All commodities for this pincode
        result = {}
        for crop, data in pincode_data.items():
            result[crop] = {
                "min":   data["min"],
                "max":   data["max"],
                "modal": data["modal"],
                "unit":  data.get("unit", "quintal"),
                "date":  data.get("date"),
                "source": data.get("source", "cache"),
            }
        return {
            "pincode": pincode,
            "pincode_used": nearest,
            "state": _pincode_to_state(pincode),
            "last_updated": last_updated,
            "prices": result,
            "count": len(result),
            "source_label": "🟢 Agmarknet Live",
            "data_attribution": "Source: Agmarknet — Ministry of Agriculture & Farmers Welfare, Govt. of India",
        }


@router.get("/live-prices/refresh")
def refresh_live_prices(background_tasks: BackgroundTasks):
    """
    Trigger a background refresh of price data from Agmarknet.
    Returns immediately; data updates in background (~30 seconds).
    """
    def _run_refresh():
        try:
            subprocess.run(
                [sys.executable, FETCH_SCRIPT],
                timeout=60,
                capture_output=True,
            )
            # Reload cache after script finishes
            _load_prices(force=True)
        except Exception as e:
            print(f"[live-prices/refresh] Error: {e}")

    background_tasks.add_task(_run_refresh)
    return {
        "status": "refresh_triggered",
        "message": "Agmarknet price refresh started in background. Check back in ~30 seconds.",
        "last_loaded": _last_loaded.isoformat() if _last_loaded else None,
    }


@router.get("/live-prices/summary")
def price_summary():
    """Returns a summary of all available commodities and pincodes."""
    prices = _load_prices()

    commodities = set()
    for pin_data in prices.values():
        commodities.update(pin_data.keys())

    sample = {}
    first_pin = list(prices.keys())[0]
    for crop, data in prices[first_pin].items():
        sample[crop] = data["modal"]

    return {
        "pincodes_available": list(prices.keys()),
        "commodities": sorted(commodities),
        "sample_modal_prices_karnataka": sample,
        "last_updated": list(prices[first_pin].values())[0].get("date"),
        "source": "Agmarknet — Ministry of Agriculture & Farmers Welfare",
    }
