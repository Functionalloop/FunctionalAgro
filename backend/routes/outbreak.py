"""
GET /api/outbreak-check?pincode=560001&crop=Tomato
GET /api/outbreak-map
Queries the diagnoses table to detect disease outbreaks (≥3 same disease/crop/pincode in 7 days).
"""
import json
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db, Diagnosis

router = APIRouter()

ZONE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "pincode_zone_crops.json")
OUTBREAK_THRESHOLD = 3
WINDOW_DAYS = 7

_zone_data: dict = {}

def _load_zones() -> dict:
    global _zone_data
    if not _zone_data:
        with open(ZONE_PATH) as f:
            _zone_data = json.load(f)
    return _zone_data


@router.get("/outbreak-check")
def outbreak_check(
    pincode: str = Query(...),
    crop: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Returns outbreak status for a specific pincode + crop.
    Outbreak = ≥3 same disease/crop/pincode diagnoses within the last 7 days.
    """
    cutoff = datetime.utcnow() - timedelta(days=WINDOW_DAYS)

    # Find the most-reported disease for this crop/pincode in the window
    results = (
        db.query(Diagnosis.disease, func.count(Diagnosis.id).label("count"))
        .filter(
            Diagnosis.pincode == pincode,
            Diagnosis.crop == crop,
            Diagnosis.timestamp >= cutoff,
        )
        .group_by(Diagnosis.disease)
        .order_by(func.count(Diagnosis.id).desc())
        .all()
    )

    if not results:
        return {
            "outbreak": False,
            "pincode": pincode,
            "crop": crop,
            "count": 0,
            "threshold": OUTBREAK_THRESHOLD,
            "window_days": WINDOW_DAYS,
        }

    top_disease, top_count = results[0]
    outbreak = top_count >= OUTBREAK_THRESHOLD

    return {
        "outbreak": outbreak,
        "pincode": pincode,
        "crop": crop,
        "disease": top_disease,
        "count": top_count,
        "threshold": OUTBREAK_THRESHOLD,
        "window_days": WINDOW_DAYS,
        "alert_message": (
            f"⚠️ OUTBREAK ALERT: {top_count} cases of {top_disease} in {crop} "
            f"detected near pincode {pincode} in the last {WINDOW_DAYS} days!"
            if outbreak else None
        ),
    }


@router.get("/outbreak-map")
def outbreak_map(db: Session = Depends(get_db)):
    """
    Returns all active outbreak hotspots across all pincodes (for map display).
    Each entry has pincode, crop, disease, count, lat, lng.
    """
    cutoff = datetime.utcnow() - timedelta(days=WINDOW_DAYS)
    zones = _load_zones()

    results = (
        db.query(
            Diagnosis.pincode,
            Diagnosis.crop,
            Diagnosis.disease,
            func.count(Diagnosis.id).label("count"),
        )
        .filter(Diagnosis.timestamp >= cutoff)
        .group_by(Diagnosis.pincode, Diagnosis.crop, Diagnosis.disease)
        .order_by(func.count(Diagnosis.id).desc())
        .all()
    )

    hotspots = []
    for pincode, crop, disease, count in results:
        zone = zones.get(pincode, {})
        hotspots.append({
            "pincode":  pincode,
            "crop":     crop,
            "disease":  disease,
            "count":    count,
            "outbreak": count >= OUTBREAK_THRESHOLD,
            "district": zone.get("district", pincode),
            "state":    zone.get("state", ""),
            "lat":      zone.get("lat", 20.5937),
            "lng":      zone.get("lng", 78.9629),
        })

    return {
        "hotspots": hotspots,
        "total_outbreaks": sum(1 for h in hotspots if h["outbreak"]),
        "threshold": OUTBREAK_THRESHOLD,
        "window_days": WINDOW_DAYS,
    }
