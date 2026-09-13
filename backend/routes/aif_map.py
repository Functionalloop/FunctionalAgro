"""
GET /api/aif-map
Returns all geo-tagged Agri Infra Fund projects for map overlay.
Data source: AIKosh Agri Infra Fund Dataset (Ministry of Agriculture & Farmers Welfare, GoI)

GET /api/aif-map?state=Karnataka           → filter by state
GET /api/aif-map?type=Cold+Storage         → filter by project type
GET /api/aif-map?status=Disbursed          → filter by loan status
GET /api/aif-summary                       → state-wise AIF scheme summary
"""
import json
import os
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()

GEO_PATH     = os.path.join(os.path.dirname(__file__), "..", "..", "data", "aif_geo_projects.json")
SCHEMES_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "agri_infra_schemes.json")

_geo_data:     list = []
_schemes_data: dict = {}


def _load_geo() -> list:
    global _geo_data
    if _geo_data:
        return _geo_data
    if os.path.exists(GEO_PATH):
        with open(GEO_PATH, encoding="utf-8") as f:
            _geo_data = json.load(f)
    return _geo_data


def _load_schemes() -> dict:
    global _schemes_data
    if _schemes_data:
        return _schemes_data
    if os.path.exists(SCHEMES_PATH):
        with open(SCHEMES_PATH, encoding="utf-8") as f:
            _schemes_data = json.load(f)
    return _schemes_data


@router.get("/aif-map")
def aif_map(
    state:  Optional[str] = Query(None, description="Filter by state name (case-insensitive)"),
    type:   Optional[str] = Query(None, description="Filter by project type"),
    status: Optional[str] = Query(None, description="Filter by loan status (e.g. Disbursed)"),
):
    """
    Returns geo-tagged Agri Infra Fund project points for map overlay.
    Source: AIKosh — Ministry of Agriculture & Farmers Welfare, GoI.
    """
    projects = _load_geo()

    if not projects:
        return {
            "total": 0,
            "projects": [],
            "source": "AIKosh Agri Infra Fund Dataset",
            "note": "Run data/parse_aikosh.py to generate aif_geo_projects.json",
        }

    filtered = projects

    if state:
        filtered = [p for p in filtered if p.get("state", "").lower() == state.lower()]

    if type:
        filtered = [p for p in filtered if type.lower() in p.get("type", "").lower()]

    if status:
        filtered = [p for p in filtered if p.get("status", "").lower() == status.lower()]

    # Collect unique filter options from full dataset for frontend dropdowns
    all_states  = sorted({p["state"] for p in projects if p.get("state")})
    all_types   = sorted({p["type"]  for p in projects if p.get("type")})
    all_statuses = sorted({p["status"] for p in projects if p.get("status")})

    return {
        "total":    len(filtered),
        "projects": filtered,
        "filters": {
            "states":   all_states,
            "types":    all_types,
            "statuses": all_statuses,
        },
        "source": "AIKosh Agri Infra Fund Dataset — Ministry of Agriculture & Farmers Welfare, GoI",
    }


@router.get("/aif-summary")
def aif_summary(state: Optional[str] = Query(None, description="Specific state (optional)")):
    """
    Returns state-wise Agri Infra Fund scheme summary.
    Includes total projects, loan amounts (₹ lakhs), project types, beneficiary types.
    """
    schemes = _load_schemes()

    if not schemes:
        return {
            "states": [],
            "source": "AIKosh Agri Infra Fund Dataset",
            "note": "Run data/parse_aikosh.py to generate agri_infra_schemes.json",
        }

    if state:
        state_title = state.title()
        state_data  = schemes.get(state_title)
        if not state_data:
            # Case-insensitive search
            for k, v in schemes.items():
                if k.lower() == state.lower():
                    state_data = v
                    state_title = k
                    break
        return {
            "state":  state_title,
            "data":   state_data,
            "source": "AIKosh Agri Infra Fund Dataset — Ministry of Agriculture & Farmers Welfare, GoI",
        }

    # National overview
    total_projects = sum(s["total_projects"] for s in schemes.values())
    total_amount   = round(sum(s["total_amount_lakhs"] for s in schemes.values()), 2)

    return {
        "national_summary": {
            "total_projects":      total_projects,
            "total_amount_lakhs":  total_amount,
            "total_amount_crores": round(total_amount / 100, 2),
            "states_covered":      len(schemes),
        },
        "by_state": {
            state: {
                "total_projects":    data["total_projects"],
                "total_amount_lakhs": data["total_amount_lakhs"],
                "top_project_type":  data["project_types"][0]["type"] if data["project_types"] else "N/A",
                "top_beneficiary":   data["beneficiary_types"][0]["type"] if data["beneficiary_types"] else "N/A",
            }
            for state, data in sorted(schemes.items(), key=lambda x: -x[1]["total_projects"])
        },
        "source": "AIKosh Agri Infra Fund Dataset — Ministry of Agriculture & Farmers Welfare, GoI",
    }
