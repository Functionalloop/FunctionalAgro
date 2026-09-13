import sys, os
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

"""
AIKosh Data Parser — Phase 2 (Real Dataset Integration)
Converts real AIKosh CSV files into FunctionalAgro lookup JSONs.

Usage (run from project root):
    python data/parse_aikosh.py

Inputs:
    data/raw/agro_climatic_zone.csv   ← AIKosh Agro Climatic Zone Registry
    data/raw/agri_infra_fund.csv      ← AIKosh Agri Infra Fund Dataset

Outputs:
    data/pincode_zone_crops.json      ← district/state → zone + crops (used by /api/recommend-crop)
    data/agri_infra_schemes.json      ← state → AIF scheme summary (used by /api/recommend-crop)
    data/aif_geo_projects.json        ← individual geo-tagged AIF projects (used by /api/aif-map)

Real column names (from AIKosh):
  Zone CSV:  Sr No., Acz Code, Acz Name, State Name, State Lgd Code,
             District Lgd Code, District Name, Active Date, Inactive Date
  AIF  CSV:  BeneficiaryID, BeneficiaryType, Category, Loan_Application_Number,
             Is_Individual, Project_Name, Loan_Application_Status_Name,
             Approved_Loan_Amount_AIF, Approved_Loan_Term_Year, Approved_Loan_Term_Month,
             Gender, Project_Description, Project_Cost, Project_Type,
             Loan_Application_Type, Project_State_Name, Project_State_Code,
             Project_District_Name, Project_District_Code, Project_Village_Name,
             Project_Village_Code, Project_Geo_Latitude, Project_Geo_Longitude,
             Project_Geo_Fencing, Project_Geo_Fencing_Type, Project_Geo_Update_Date,
             Scheme_Type, Is_Geo_Data_Updated_By_Krishi_Mapper_App
"""

import csv
import json
import os
import sys

RAW_DIR  = os.path.join(os.path.dirname(__file__), "raw")
OUT_DIR  = os.path.dirname(__file__)

ZONE_FILE = os.path.join(RAW_DIR, "agro_climatic_zone.csv")
AIF_FILE  = os.path.join(RAW_DIR, "agri_infra_fund.csv")

OUT_ZONE     = os.path.join(OUT_DIR, "pincode_zone_crops.json")
OUT_AIF      = os.path.join(OUT_DIR, "agri_infra_schemes.json")
OUT_AIF_GEO  = os.path.join(OUT_DIR, "aif_geo_projects.json")


# ── Agro-Climatic Zone metadata ──────────────────────────────────────────────

ZONE_CROP_MAP = {
    "Western Himalayan Region":            ["Apple", "Wheat", "Barley", "Pea", "Potato"],
    "Eastern Himalayan Region":            ["Rice", "Maize", "Potato", "Ginger", "Cardamom"],
    "Lower Gangetic Plains":               ["Rice", "Jute", "Mustard", "Potato", "Banana"],
    "Middle Gangetic Plains":              ["Rice", "Wheat", "Sugarcane", "Potato", "Pea"],
    "Upper Gangetic Plains":               ["Wheat", "Rice", "Sugarcane", "Potato", "Mustard"],
    "Trans-Gangetic Plains":               ["Wheat", "Rice", "Sugarcane", "Mustard", "Maize"],
    "Eastern Plateau and Hill Region":     ["Rice", "Maize", "Pulses", "Oilseeds", "Cotton"],
    "Central Plateau and Hill Region":     ["Soybean", "Maize", "Cotton", "Jowar", "Groundnut"],
    "Western Plateau and Hill Region":     ["Cotton", "Jowar", "Groundnut", "Soybean", "Maize"],
    "Southern Plateau and Hill Region":    ["Ragi", "Groundnut", "Cotton", "Maize", "Sunflower"],
    "East Coast Plains & Hill Region":     ["Rice", "Groundnut", "Cotton", "Sugarcane", "Chilli"],
    "Western coast plains and ghat region":["Rice", "Coconut", "Cashew", "Arecanut", "Banana"],
    "Gujarat plains and hills region":     ["Cotton", "Groundnut", "Bajra", "Wheat", "Castor"],
    "Western dry region":                  ["Bajra", "Wheat", "Mustard", "Cluster Bean", "Cumin"],
    "The Islands Region":                  ["Rice", "Coconut", "Vegetables", "Tubers"],
}

ZONE_RAINFALL = {
    "Western Himalayan Region":            "600-1200",
    "Eastern Himalayan Region":            "2000-4000",
    "Lower Gangetic Plains":               "1400-1800",
    "Middle Gangetic Plains":              "1000-1400",
    "Upper Gangetic Plains":               "750-1000",
    "Trans-Gangetic Plains":               "600-800",
    "Eastern Plateau and Hill Region":     "1000-1400",
    "Central Plateau and Hill Region":     "800-1200",
    "Western Plateau and Hill Region":     "600-900",
    "Southern Plateau and Hill Region":    "700-1000",
    "East Coast Plains & Hill Region":     "1200-1400",
    "Western coast plains and ghat region":"2000-3000",
    "Gujarat plains and hills region":     "500-700",
    "Western dry region":                  "200-500",
    "The Islands Region":                  "2000-3500",
}

ZONE_SOIL = {
    "Western Himalayan Region":            "Mountain/Forest soil",
    "Eastern Himalayan Region":            "Red Laterite",
    "Lower Gangetic Plains":               "Deltaic Alluvial",
    "Middle Gangetic Plains":              "Alluvial",
    "Upper Gangetic Plains":               "Alluvial",
    "Trans-Gangetic Plains":               "Alluvial",
    "Eastern Plateau and Hill Region":     "Red & Yellow",
    "Central Plateau and Hill Region":     "Black Cotton (Vertisol)",
    "Western Plateau and Hill Region":     "Black Cotton (Vertisol)",
    "Southern Plateau and Hill Region":    "Red Laterite",
    "East Coast Plains & Hill Region":     "Coastal Alluvial",
    "Western coast plains and ghat region":"Laterite",
    "Gujarat plains and hills region":     "Medium Black",
    "Western dry region":                  "Sandy Loam (Aridisol)",
    "The Islands Region":                  "Sandy Coastal",
}


# Approximate district-centroid lat/lng for major districts
# (zone CSV has no coordinates; AIF CSV geo is used for AIF projects separately)
DISTRICT_COORDS = {
    "Leh Ladakh":     (34.1526, 77.5771),
    "Kargil":         (34.5539, 76.1349),
    "Anantnag":       (33.7309, 75.1520),
    "Srinagar":       (34.0837, 74.7973),
    "Jammu":          (32.7266, 74.8570),
    "Shimla":         (31.1048, 77.1734),
    "Kangra":         (32.0998, 76.2691),
    "Kullu":          (31.9578, 77.1095),
    "Dehradun":       (30.3165, 78.0322),
    "Haridwar":       (29.9457, 78.1642),
    "Nainital":       (29.3803, 79.4636),
    "Darjeeling":     (27.0360, 88.2627),
    "Sikkim East":    (27.3389, 88.6065),
    "Shillong":       (25.5788, 91.8933),
    "Dibrugarh":      (27.4728, 94.9120),
    "Guwahati":       (26.1445, 91.7362),
    "Patna":          (25.5941, 85.1376),
    "Muzaffarpur":    (26.1197, 85.3910),
    "Varanasi":       (25.3176, 82.9739),
    "Lucknow":        (26.8467, 80.9462),
    "Kanpur Nagar":   (26.4499, 80.3319),
    "Agra":           (27.1767, 78.0081),
    "Meerut":         (28.9845, 77.7064),
    "Amritsar":       (31.6340, 74.8723),
    "Ludhiana":       (30.9010, 75.8573),
    "Chandigarh":     (30.7333, 76.7794),
    "Hisar":          (29.1492, 75.7217),
    "Sonipat":        (28.9288, 77.0152),
    "Gurugram":       (28.4595, 77.0266),
    "Faridabad":      (28.4089, 77.3178),
    "Jaipur":         (26.9124, 75.7873),
    "Jodhpur":        (26.2389, 73.0243),
    "Udaipur":        (24.5854, 73.7125),
    "Bikaner":        (28.0229, 73.3119),
    "Raipur":         (21.2514, 81.6296),
    "Bhopal":         (23.2599, 77.4126),
    "Indore":         (22.7196, 75.8577),
    "Gwalior":        (26.2183, 78.1828),
    "Jabalpur":       (23.1815, 79.9864),
    "Nagpur":         (21.1458, 79.0882),
    "Pune":           (18.5204, 73.8567),
    "Mumbai":         (18.9388, 72.8354),
    "Nashik":         (19.9975, 73.7898),
    "Aurangabad":     (19.8762, 75.3433),
    "Ahmedabad":      (23.0225, 72.5714),
    "Surat":          (21.1702, 72.8311),
    "Rajkot":         (22.3039, 70.8022),
    "Vadodara":       (22.3072, 73.1812),
    "Bangalore Urban":(12.9716, 77.5946),
    "Bengaluru Urban":(12.9716, 77.5946),
    "Mysuru":         (12.2958, 76.6394),
    "Tumakuru":       (13.3379, 77.1173),
    "Mangaluru":      (12.9141, 74.8560),
    "Hyderabad":      (17.3850, 78.4867),
    "Warangal":       (17.9784, 79.5941),
    "Nizamabad":      (18.6725, 78.0941),
    "Chennai":        (13.0827, 80.2707),
    "Coimbatore":     (11.0168, 76.9558),
    "Madurai":        (9.9252, 78.1198),
    "Salem":          (11.6643, 78.1460),
    "Kolkata":        (22.5726, 88.3639),
    "Howrah":         (22.5958, 88.2636),
    "Burdwan":        (23.2324, 87.8615),
    "Malda":          (25.0108, 88.1414),
    "Bhubaneswar":    (20.2961, 85.8245),
    "Cuttack":        (20.4625, 85.8828),
    "Ranchi":         (23.3441, 85.3096),
    "Dhanbad":        (23.7957, 86.4304),
    "New Delhi":      (28.6139, 77.2090),
    "Central Delhi":  (28.6139, 77.2090),
    "North Goa":      (15.4909, 73.8278),
    "South Goa":      (15.1726, 74.0497),
    "Ernakulam":      (9.9312, 76.2673),
    "Thiruvananthapuram": (8.5241, 76.9366),
    "Kozhikode":      (11.2588, 75.7804),
}


# ── Parsers ──────────────────────────────────────────────────────────────────

def _read_csv(path: str) -> list[dict]:
    rows = []
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(dict(row))
    return rows


def build_zone_lookup(zone_rows: list[dict]) -> dict:
    """
    Build pincode_zone_crops.json from real AIKosh zone data.
    Real columns: Acz Code, Acz Name, State Name, District Name, District Lgd Code
    Groups districts by zone + state. Uses DISTRICT_COORDS for lat/lng.
    """
    # district_name -> { zone, acz_code, state, districts_in_zone }
    district_zone: dict[str, dict] = {}

    for row in zone_rows:
        acz_code  = str(row.get("Acz Code", "")).strip()
        acz_name  = str(row.get("Acz Name", "")).strip()
        state     = str(row.get("State Name", "")).strip().title()
        district  = str(row.get("District Name", "")).strip().title()
        lgd_code  = str(row.get("District Lgd Code", "")).strip()

        if not acz_name or not district:
            continue

        key = f"{district}|{state}"
        if key not in district_zone:
            district_zone[key] = {
                "acz_code": acz_code,
                "zone": acz_name,
                "state": state,
                "district": district,
                "district_lgd_code": lgd_code,
            }

    print(f"   Unique district-state pairs found: {len(district_zone)}")

    # Build lookup keyed by district_lgd_code (numeric) used as a proxy key
    # Also create a named-district lookup for the backend to use
    lookup: dict = {}

    for key, meta in district_zone.items():
        zone      = meta["zone"]
        district  = meta["district"]
        state     = meta["state"]
        lgd_code  = meta["district_lgd_code"]

        # Resolve coordinates
        lat, lng = DISTRICT_COORDS.get(district, (20.5937, 78.9629))  # India centroid fallback

        # Use LGD code as a pseudo-pincode key (padded to 6 digits)
        # Also store district name as lookup key for backend fuzzy matching
        entry = {
            "zone":           zone,
            "acz_code":       meta["acz_code"],
            "district":       district,
            "state":          state,
            "district_lgd_code": lgd_code,
            "suitable_crops": ZONE_CROP_MAP.get(zone, ["Wheat", "Rice", "Maize"]),
            "rainfall_mm":    ZONE_RAINFALL.get(zone, "600-1000"),
            "soil_type":      ZONE_SOIL.get(zone, "Mixed"),
            "lat":            lat,
            "lng":            lng,
            "source":         "AIKosh Agro Climatic Zone Registry — Ministry of Agriculture & Farmers Welfare, GoI",
        }

        # Store by district|state key (used by name-based lookup)
        lookup[key] = entry

    return lookup


def build_aif_schemes(aif_rows: list[dict]) -> tuple[dict, list]:
    """
    Build:
      agri_infra_schemes.json  → state → summary (project types, beneficiary types, total amount)
      aif_geo_projects.json    → list of geo-tagged project points for map overlay

    Real columns: Project_State_Name, Project_District_Name, Project_Type,
                  BeneficiaryType, Approved_Loan_Amount_AIF, Loan_Application_Status_Name,
                  Project_Geo_Latitude, Project_Geo_Longitude, Project_Name,
                  Scheme_Type, Category
    """
    schemes_by_state: dict = {}
    geo_projects: list = []

    for row in aif_rows:
        state    = str(row.get("Project_State_Name", "")).strip().title()
        district = str(row.get("Project_District_Name", "")).strip().title()
        proj_type = str(row.get("Project_Type", "")).strip()
        benef_type = str(row.get("BeneficiaryType", "")).strip()
        proj_name  = str(row.get("Project_Name", "")).strip()
        status     = str(row.get("Loan_Application_Status_Name", "")).strip()
        scheme     = str(row.get("Scheme_Type", "Agri Infra Fund")).strip()
        category   = str(row.get("Category", "")).strip()

        # Loan amount — convert to lakhs
        raw_amount = str(row.get("Approved_Loan_Amount_AIF", "")).strip()
        try:
            amount_lakhs = round(float(raw_amount) / 100_000, 2) if raw_amount else None
        except ValueError:
            amount_lakhs = None

        lat_raw = str(row.get("Project_Geo_Latitude", "")).strip()
        lng_raw = str(row.get("Project_Geo_Longitude", "")).strip()
        try:
            lat = float(lat_raw) if lat_raw else None
            lng = float(lng_raw) if lng_raw else None
        except ValueError:
            lat = lng = None

        if not state:
            continue

        # ── Geo project point (for map) ─────────────────────────────────────
        if lat and lng and proj_name:
            geo_projects.append({
                "name":         proj_name,
                "type":         proj_type,
                "beneficiary":  benef_type,
                "state":        state,
                "district":     district,
                "status":       status,
                "amount_lakhs": amount_lakhs,
                "scheme":       scheme,
                "lat":          lat,
                "lng":          lng,
            })

        # ── State summary ────────────────────────────────────────────────────
        if state not in schemes_by_state:
            schemes_by_state[state] = {
                "total_projects":    0,
                "total_amount_lakhs": 0.0,
                "project_types":     {},
                "beneficiary_types": {},
                "status_counts":     {},
                "districts":         set(),
                "source":            "AIKosh — Agri Infra Fund (Ministry of Agriculture & Farmers Welfare, GoI)",
            }

        s = schemes_by_state[state]
        s["total_projects"] += 1
        if amount_lakhs:
            s["total_amount_lakhs"] = round(s["total_amount_lakhs"] + amount_lakhs, 2)
        if proj_type:
            s["project_types"][proj_type] = s["project_types"].get(proj_type, 0) + 1
        if benef_type:
            s["beneficiary_types"][benef_type] = s["beneficiary_types"].get(benef_type, 0) + 1
        if status:
            s["status_counts"][status] = s["status_counts"].get(status, 0) + 1
        if district:
            s["districts"].add(district)

    # Finalise: sort type dicts by count, convert sets to lists
    final_schemes: dict = {}
    for state, s in schemes_by_state.items():
        final_schemes[state] = {
            "total_projects":    s["total_projects"],
            "total_amount_lakhs": s["total_amount_lakhs"],
            "project_types": [
                {"type": t, "count": c}
                for t, c in sorted(s["project_types"].items(), key=lambda x: -x[1])
            ],
            "beneficiary_types": [
                {"type": t, "count": c}
                for t, c in sorted(s["beneficiary_types"].items(), key=lambda x: -x[1])
            ],
            "status_counts": dict(sorted(s["status_counts"].items(), key=lambda x: -x[1])),
            "districts_covered": sorted(s["districts"]),
            "source": s["source"],
        }

    return final_schemes, geo_projects


# ── Pincode-compatible zone lookup (for /api/recommend-crop) ─────────────────

# Maps existing 6-digit pincodes to district names (for zone lookup bridge)
PINCODE_TO_DISTRICT: dict[str, str] = {
    # Karnataka
    "560001": "Bengaluru Urban|Karnataka",
    "570001": "Mysuru|Karnataka",
    "572101": "Tumakuru|Karnataka",
    # Maharashtra
    "400001": "Mumbai|Maharashtra",
    "411001": "Pune|Maharashtra",
    "440001": "Nagpur|Maharashtra",
    "422001": "Nashik|Maharashtra",
    "431001": "Aurangabad|Maharashtra",
    # Delhi
    "110001": "New Delhi|Delhi",
    # Tamil Nadu
    "600001": "Chennai|Tamil Nadu",
    "641001": "Coimbatore|Tamil Nadu",
    "625001": "Madurai|Tamil Nadu",
    "636001": "Salem|Tamil Nadu",
    # Telangana
    "500001": "Hyderabad|Telangana",
    "506001": "Warangal|Telangana",
    "503001": "Nizamabad|Telangana",
    # Rajasthan
    "302001": "Jaipur|Rajasthan",
    "342001": "Jodhpur|Rajasthan",
    "313001": "Udaipur|Rajasthan",
    "334001": "Bikaner|Rajasthan",
    # Uttar Pradesh
    "208001": "Kanpur Nagar|Uttar Pradesh",
    "226001": "Lucknow|Uttar Pradesh",
    "282001": "Agra|Uttar Pradesh",
    "250001": "Meerut|Uttar Pradesh",
    "221001": "Varanasi|Uttar Pradesh",
    # West Bengal
    "700001": "Kolkata|West Bengal",
    "711101": "Howrah|West Bengal",
    "713101": "Burdwan|West Bengal",
    "732101": "Malda|West Bengal",
    "734101": "Darjeeling|West Bengal",
    # Gujarat
    "380001": "Ahmedabad|Gujarat",
    "395001": "Surat|Gujarat",
    "360001": "Rajkot|Gujarat",
    "390001": "Vadodara|Gujarat",
    # Punjab
    "141001": "Ludhiana|Punjab",
    "143001": "Amritsar|Punjab",
    # Haryana
    "131001": "Sonipat|Haryana",
    "125001": "Hisar|Haryana",
    # Madhya Pradesh
    "462001": "Bhopal|Madhya Pradesh",
    "452001": "Indore|Madhya Pradesh",
    "474001": "Gwalior|Madhya Pradesh",
    "482001": "Jabalpur|Madhya Pradesh",
    # Chhattisgarh
    "492001": "Raipur|Chhattisgarh",
    # Odisha
    "751001": "Bhubaneswar|Odisha",
    "753001": "Cuttack|Odisha",
    # Jharkhand
    "834001": "Ranchi|Jharkhand",
    "826001": "Dhanbad|Jharkhand",
    # Bihar
    "800001": "Patna|Bihar",
    "842001": "Muzaffarpur|Bihar",
    # Assam
    "786001": "Dibrugarh|Assam",
    # Uttarakhand
    "248001": "Dehradun|Uttarakhand",
    "249401": "Haridwar|Uttarakhand",
    "263001": "Nainital|Uttarakhand",
    # Himachal Pradesh
    "170001": "Shimla|Himachal Pradesh",
    "176001": "Kangra|Himachal Pradesh",
    "175101": "Kullu|Himachal Pradesh",
    # Jammu & Kashmir
    "190001": "Srinagar|Jammu And Kashmir",
    "180001": "Jammu|Jammu And Kashmir",
    # Ladakh
    "194101": "Leh Ladakh|Ladakh",
    "682001": "Ernakulam|Kerala",
    "695001": "Thiruvananthapuram|Kerala",
    "673001": "Kozhikode|Kerala",
    "403501": "North Goa|Goa",
    "403001": "South Goa|Goa",
}


def build_pincode_lookup(zone_lookup: dict) -> dict:
    """
    Convert the district-keyed zone_lookup to a pincode-keyed lookup
    compatible with the existing /api/recommend-crop endpoint.
    """
    pincode_lookup: dict = {}
    for pincode, district_state_key in PINCODE_TO_DISTRICT.items():
        entry = zone_lookup.get(district_state_key)
        if entry:
            pincode_lookup[pincode] = entry
    return pincode_lookup


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║   FunctionalAgro — AIKosh Data Parser (Real Datasets)   ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()

    # Check files exist
    missing = []
    if not os.path.exists(ZONE_FILE):
        missing.append(f"  ❌ {ZONE_FILE}")
    if not os.path.exists(AIF_FILE):
        missing.append(f"  ❌ {AIF_FILE}")

    if missing:
        print("Missing input files:")
        for m in missing:
            print(m)
        sys.exit(1)

    # ── Zone data ─────────────────────────────────────────────────────────────
    print("📊 Parsing AIKosh Agro Climatic Zone Registry...")
    zone_rows = _read_csv(ZONE_FILE)
    print(f"   Total rows: {len(zone_rows)}")

    zone_lookup    = build_zone_lookup(zone_rows)
    pincode_lookup = build_pincode_lookup(zone_lookup)

    with open(OUT_ZONE, "w", encoding="utf-8") as f:
        json.dump(pincode_lookup, f, indent=2, ensure_ascii=False)
    print(f"   ✅ Wrote {len(pincode_lookup)} pincodes → {OUT_ZONE}")

    # Also write the full district-level lookup for richer queries
    district_out = os.path.join(OUT_DIR, "district_zone_lookup.json")
    with open(district_out, "w", encoding="utf-8") as f:
        json.dump(zone_lookup, f, indent=2, ensure_ascii=False)
    print(f"   ✅ Wrote {len(zone_lookup)} districts → {district_out}")

    # ── AIF data ──────────────────────────────────────────────────────────────
    print()
    print("📊 Parsing AIKosh Agri Infra Fund Dataset...")
    aif_rows = _read_csv(AIF_FILE)
    print(f"   Total rows: {len(aif_rows)}")

    aif_schemes, geo_projects = build_aif_schemes(aif_rows)

    with open(OUT_AIF, "w", encoding="utf-8") as f:
        json.dump(aif_schemes, f, indent=2, ensure_ascii=False)
    print(f"   ✅ Wrote {len(aif_schemes)} states → {OUT_AIF}")

    with open(OUT_AIF_GEO, "w", encoding="utf-8") as f:
        json.dump(geo_projects, f, indent=2, ensure_ascii=False)
    print(f"   ✅ Wrote {len(geo_projects)} geo-tagged projects → {OUT_AIF_GEO}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print("══════════════════════════════════════════════════════════")
    print(f"  Zone registry   : {len(zone_rows)} district-zone rows parsed")
    print(f"  Unique districts: {len(zone_lookup)} district-state pairs")
    print(f"  Pincodes mapped : {len(pincode_lookup)}")
    print(f"  AIF projects    : {len(aif_rows)} rows → {len(geo_projects)} geo-tagged")
    print(f"  States with AIF : {len(aif_schemes)}")
    print("══════════════════════════════════════════════════════════")
    print()
    print("✅ AIKosh data integration complete!")
    print()
    print("Next: restart the backend to reload data.")
    print("  python -m uvicorn backend.main:app --reload --port 8000")


if __name__ == "__main__":
    main()
