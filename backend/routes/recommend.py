"""
GET /api/recommend-crop?pincode=560001
GET /api/recommend-crop?district=Tumakuru&state=Karnataka
Returns agro-climatic zone + suitable crops for a given pincode OR district name.

Data sources:
  - AIKosh Agro Climatic Zone Registry (784 districts, 15 agro-climatic zones)
  - AIKosh Agri Infra Fund Dataset (500 projects, 19 states)
"""
import json
import os
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter()

ZONE_PATH     = os.path.join(os.path.dirname(__file__), "..", "..", "data", "pincode_zone_crops.json")
DISTRICT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "district_zone_lookup.json")
AIF_PATH      = os.path.join(os.path.dirname(__file__), "..", "..", "data", "agri_infra_schemes.json")

_zone_data:     dict = {}
_district_data: dict = {}
_aif_data:      dict = {}


def _load_zones() -> dict:
    global _zone_data
    if _zone_data:
        return _zone_data
    with open(ZONE_PATH, encoding="utf-8") as f:
        _zone_data = json.load(f)
    return _zone_data


def _load_districts() -> dict:
    global _district_data
    if _district_data:
        return _district_data
    if os.path.exists(DISTRICT_PATH):
        with open(DISTRICT_PATH, encoding="utf-8") as f:
            _district_data = json.load(f)
    return _district_data


def _load_aif() -> dict:
    global _aif_data
    if _aif_data:
        return _aif_data
    if os.path.exists(AIF_PATH):
        with open(AIF_PATH, encoding="utf-8") as f:
            _aif_data = json.load(f)
    return _aif_data


@router.get("/recommend-crop")
def recommend_crop(
    pincode:  Optional[str] = Query(None, description="6-digit Indian pincode"),
    district: Optional[str] = Query(None, description="District name (use with state)"),
    state:    Optional[str] = Query(None, description="State name (use with district)"),
):
    """
    Returns AIKosh agro-climatic zone and suitable crops.

    Lookup priority:
      1. Exact pincode match
      2. District + State name match (covers all 784 AIKosh districts)
      3. Fuzzy pincode prefix match (first 3 digits)
      4. Fuzzy district name match (partial string)

    Also returns Agri Infra Fund scheme eligibility for the matched state.
    """
    if not pincode and not district:
        raise HTTPException(
            status_code=400,
            detail="Provide either 'pincode' or 'district' (optionally with 'state').",
        )

    zones     = _load_zones()
    districts = _load_districts()
    aif       = _load_aif()

    data = None
    matched_by   = None
    matched_key  = None
    note         = None

    # ── 1. Exact pincode ──────────────────────────────────────────────────────
    if pincode:
        data = zones.get(pincode)
        if data:
            matched_by  = "pincode_exact"
            matched_key = pincode

    # ── 2. District + State exact match ───────────────────────────────────────
    if not data and district and state:
        key = f"{district.strip().title()}|{state.strip().title()}"
        data = districts.get(key)
        if data:
            matched_by  = "district_state_exact"
            matched_key = key

    # ── 3. District name only (search all states) ─────────────────────────────
    if not data and district:
        search = district.strip().lower()
        for key, entry in districts.items():
            dist_part = key.split("|")[0].lower()
            if dist_part == search:
                data = entry
                matched_by  = "district_name_exact"
                matched_key = key
                note = f"State not specified; showing data for {key.replace('|', ', ')}."
                break

    # ── 4. Pincode prefix fuzzy (first 3 digits) ──────────────────────────────
    if not data and pincode:
        prefix = pincode[:3]
        for p, d in zones.items():
            if p.startswith(prefix):
                data = d
                matched_by  = "pincode_fuzzy"
                matched_key = p
                note = f"Exact pincode not found. Showing data for nearby {p} ({d['district']})."
                break

    # ── 5. District name fuzzy (partial) ──────────────────────────────────────
    if not data and district:
        search = district.strip().lower()
        for key, entry in districts.items():
            dist_part = key.split("|")[0].lower()
            if search in dist_part or dist_part in search:
                data = entry
                matched_by  = "district_fuzzy"
                matched_key = key
                note = f"Fuzzy match. Showing data for {key.replace('|', ', ')}."
                break

    if not data:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No zone data found for the given inputs. "
                f"Supported pincodes: {list(zones.keys())[:10]}... "
                f"or search by district name."
            ),
        )

    # ── Agri Infra Fund schemes for this state ─────────────────────────────────
    state_name  = data.get("state", "")
    aif_schemes = None
    if aif and state_name:
        # Try exact match first, then title-case
        aif_schemes = aif.get(state_name) or aif.get(state_name.upper()) or aif.get(state_name.title())

    return {
        "query": {
            "pincode":  pincode,
            "district": district,
            "state":    state,
        },
        "matched_by":  matched_by,
        "matched_key": matched_key,
        "found":       note is None,
        "note":        note,
        "data_source": data.get("source", "AIKosh — Ministry of Agriculture & Farmers Welfare, GoI"),
        **{k: v for k, v in data.items() if k != "source"},
        "agri_infra_schemes": aif_schemes,
    }
