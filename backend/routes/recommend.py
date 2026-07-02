"""
GET /api/recommend-crop?pincode=560001
Returns agro-climatic zone + suitable crops for a given pincode.
Data source: AIKosh Agro-Ecological Zone dataset (cached locally).
Also returns Agri Infra Fund scheme eligibility if AIF data is available.
"""
import json
import os
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

ZONE_PATH    = os.path.join(os.path.dirname(__file__), "..", "..", "data", "pincode_zone_crops.json")
AIF_PATH     = os.path.join(os.path.dirname(__file__), "..", "..", "data", "agri_infra_schemes.json")

_zone_data: dict = {}
_aif_data:  dict = {}

def _load_zones() -> dict:
    global _zone_data
    if _zone_data:
        return _zone_data
    with open(ZONE_PATH) as f:
        _zone_data = json.load(f)
    return _zone_data

def _load_aif() -> dict:
    global _aif_data
    if _aif_data:
        return _aif_data
    if os.path.exists(AIF_PATH):
        with open(AIF_PATH) as f:
            _aif_data = json.load(f)
    return _aif_data


@router.get("/recommend-crop")
def recommend_crop(pincode: str = Query(..., description="6-digit Indian pincode")):
    """
    Returns AIKosh agro-climatic zone and suitable crops for the given pincode.
    Falls back to the nearest known pincode if exact match not found.
    Also returns Agri Infra Fund scheme eligibility when AIKosh AIF data is available.
    """
    zones = _load_zones()
    aif   = _load_aif()

    # Exact match
    data = zones.get(pincode)
    matched_pincode = pincode
    note = None

    if not data:
        # Fuzzy fallback: match first 3 digits (same postal region)
        prefix = pincode[:3]
        for p, d in zones.items():
            if p.startswith(prefix):
                data = d
                matched_pincode = p
                note = f"Exact pincode not found. Showing data for nearby {p} ({d['district']})."
                break

    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"No zone data found for pincode {pincode}. Supported pincodes: {list(zones.keys())}",
        )

    # Agri Infra Fund schemes for this state
    state = data.get("state", "")
    aif_schemes = aif.get(state) if aif else None

    return {
        "pincode":         pincode,
        "matched_pincode": matched_pincode,
        "found":           matched_pincode == pincode,
        "note":            note,
        "data_source":     data.get("source", "FunctionalAgro zone cache"),
        **{k: v for k, v in data.items() if k != "source"},
        "agri_infra_schemes": aif_schemes,
    }
