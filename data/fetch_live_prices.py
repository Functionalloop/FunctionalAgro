"""
Live Price Fetcher — Agmarknet Real Data
Fetches current market prices from the Agmarknet 2.0 API
(the same JSON endpoints that agmarknet.gov.in's Angular frontend calls).
Falls back to cached data if the live fetch fails.

Usage: python data/fetch_live_prices.py
Output: data/agmarknet_cache.json (updated with today's prices)
"""
import json
import os
import sys
import requests
from datetime import datetime, timedelta

OUT_PATH = os.path.join(os.path.dirname(__file__), "agmarknet_cache.json")
BACKUP_PATH = os.path.join(os.path.dirname(__file__), "agmarknet_cache_backup.json")

# Agmarknet 2.0 internal API base (used by the Angular frontend)
AGMARKNET_API = "https://agmarknet.gov.in/api"

# Commodity name -> Agmarknet commodity codes
COMMODITY_MAP = {
    "Tomato":    "Tomato",
    "Potato":    "Potato",
    "Onion":     "Onion",
    "Wheat":     "Wheat",
    "Rice":      "Rice",
    "Maize":     "Maize",
    "Cotton":    "Cotton",
    "Soybean":   "Soybean",
    "Chilli":    "Chilli",
    "Groundnut": "Groundnut",
}

# State -> Agmarknet state codes
STATE_MAP = {
    "Karnataka":     "KAR",
    "Maharashtra":   "MAH",
    "Delhi":         "DEL",
    "Andhra Pradesh":"AP",
    "Tamil Nadu":    "TN",
    "Uttar Pradesh": "UP",
    "Punjab":        "PUN",
    "Rajasthan":     "RAJ",
    "Gujarat":       "GUJ",
    "All":           "",
}

# Pincode → state mapping for lookup
PINCODE_STATE = {
    "560001": "Karnataka",
    "400001": "Maharashtra",
    "110001": "Delhi",
    "500001": "Andhra Pradesh",
    "600001": "Tamil Nadu",
    "411001": "Maharashtra",
    "302001": "Rajasthan",
    "641001": "Tamil Nadu",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://agmarknet.gov.in/",
    "Origin": "https://agmarknet.gov.in",
}

TODAY = datetime.now().strftime("%d-%b-%Y")
YESTERDAY = (datetime.now() - timedelta(days=1)).strftime("%d-%b-%Y")


def fetch_commodity_price_national(commodity: str) -> dict | None:
    """
    Fetch national average price for a commodity from Agmarknet 2.0.
    Returns dict with min/modal/max or None on failure.
    """
    # Try multiple endpoint patterns that Agmarknet 2.0 exposes
    endpoints = [
        f"{AGMARKNET_API}/MSPPriceApi/GetModalPriceReport",
        f"{AGMARKNET_API}/MarketReport/GetDailyModalPrice",
        f"{AGMARKNET_API}/PriceReport/GetNationalPrice",
    ]

    params = {
        "commodity": commodity,
        "state": "",
        "fromDate": YESTERDAY,
        "toDate": TODAY,
    }

    for ep in endpoints:
        try:
            resp = requests.get(ep, params=params, headers=HEADERS, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and data:
                    row = data[0]
                    return {
                        "min":   float(row.get("minPrice", 0)),
                        "max":   float(row.get("maxPrice", 0)),
                        "modal": float(row.get("modalPrice", 0)),
                        "unit":  "quintal",
                        "date":  datetime.now().strftime("%Y-%m-%d"),
                        "source": "agmarknet_live",
                    }
        except Exception:
            pass
    return None


def fetch_prices_via_home_api() -> dict:
    """
    Fetch from the main Agmarknet homepage API that powers the MSP table.
    Returns raw data as-is.
    """
    try:
        resp = requests.get(
            f"{AGMARKNET_API}/MSPPriceApi/GetMSPPrice",
            headers=HEADERS,
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {}


def fetch_prices_agmarknet_direct() -> dict:
    """
    Try to fetch today's price summary directly from Agmarknet's
    market price endpoint.
    """
    results = {}
    today_str = datetime.now().strftime("%d-%b-%Y")

    for commodity in COMMODITY_MAP:
        url = "https://agmarknet.gov.in/PriceAndArrivals/CommodityDailyStateWise.aspx"
        params = {
            "Tx_Commodity": commodity,
            "Tx_State": "0",  # 0 = all states
            "Tx_District": "0",
            "Tx_Market": "0",
            "Dt_From": today_str,
            "Dt_To": today_str,
            "Fr_Date": today_str,
            "To_Date": today_str,
            "Tx_Trend": "0",
            "Tx_CommodityHead": commodity,
            "Tx_StateHead": "All States",
        }
        try:
            resp = requests.get(url, params=params, headers=HEADERS, timeout=10)
            if resp.status_code == 200 and len(resp.content) > 1000:
                # Parse the HTML table
                from html.parser import HTMLParser

                class TableParser(HTMLParser):
                    def __init__(self):
                        super().__init__()
                        self.in_td = False
                        self.rows = []
                        self.current_row = []
                        self.in_table = False
                        self.in_tr = False

                    def handle_starttag(self, tag, attrs):
                        if tag == "table":
                            self.in_table = True
                        if tag == "tr" and self.in_table:
                            self.in_tr = True
                            self.current_row = []
                        if tag in ("td", "th") and self.in_tr:
                            self.in_td = True

                    def handle_endtag(self, tag):
                        if tag == "td" or tag == "th":
                            self.in_td = False
                        if tag == "tr" and self.in_tr:
                            self.in_tr = False
                            if self.current_row:
                                self.rows.append(self.current_row[:])

                    def handle_data(self, data):
                        if self.in_td:
                            self.current_row.append(data.strip())

                parser = TableParser()
                parser.feed(resp.text)

                prices_list = []
                for row in parser.rows[1:]:  # skip header
                    if len(row) >= 6:
                        try:
                            min_p = float(row[-3].replace(",", "")) if row[-3] else 0
                            max_p = float(row[-2].replace(",", "")) if row[-2] else 0
                            modal = float(row[-1].replace(",", "")) if row[-1] else 0
                            if modal > 0:
                                prices_list.append((min_p, max_p, modal))
                        except (ValueError, IndexError):
                            pass

                if prices_list:
                    # National average
                    avg_min   = round(sum(p[0] for p in prices_list) / len(prices_list))
                    avg_max   = round(sum(p[1] for p in prices_list) / len(prices_list))
                    avg_modal = round(sum(p[2] for p in prices_list) / len(prices_list))
                    results[commodity] = {
                        "min":    avg_min,
                        "max":    avg_max,
                        "modal":  avg_modal,
                        "unit":   "quintal",
                        "date":   datetime.now().strftime("%Y-%m-%d"),
                        "source": "agmarknet_scraped",
                        "markets_count": len(prices_list),
                    }
                    print(f"  ✅ {commodity}: modal ₹{avg_modal}/q ({len(prices_list)} markets)")
                else:
                    print(f"  ⚠️  {commodity}: no price rows found")
        except Exception as e:
            print(f"  ❌ {commodity}: {e}")

    return results


def load_existing_cache() -> dict:
    """Load existing cache as baseline."""
    try:
        with open(OUT_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def build_pincode_prices(national_prices: dict, existing_cache: dict) -> dict:
    """
    Build per-pincode price dict by applying regional multipliers
    to national average prices.
    """
    PINCODES = {
        "560001": {"state": "Karnataka",     "mult": 1.00},
        "400001": {"state": "Maharashtra",   "mult": 1.10},
        "411001": {"state": "Maharashtra",   "mult": 1.08},
        "110001": {"state": "Delhi",         "mult": 1.05},
        "500001": {"state": "Andhra Pradesh","mult": 0.95},
        "600001": {"state": "Tamil Nadu",    "mult": 0.98},
        "302001": {"state": "Rajasthan",     "mult": 0.92},
        "641001": {"state": "Tamil Nadu",    "mult": 0.97},
    }

    result = {}
    today_str = datetime.now().strftime("%Y-%m-%d")

    for pincode, info in PINCODES.items():
        mult = info["mult"]
        pincode_data = {}

        for crop in COMMODITY_MAP:
            if crop in national_prices:
                nat = national_prices[crop]
                pincode_data[crop] = {
                    "min":    round(nat["min"]   * mult),
                    "max":    round(nat["max"]   * mult),
                    "modal":  round(nat["modal"] * mult),
                    "unit":   "quintal",
                    "date":   today_str,
                    "source": nat.get("source", "agmarknet_live"),
                    "state":  info["state"],
                }
            elif pincode in existing_cache and crop in existing_cache[pincode]:
                # Keep existing data with stale flag
                pincode_data[crop] = {
                    **existing_cache[pincode][crop],
                    "source": "cache_stale",
                }

        result[pincode] = pincode_data

    return result


def main():
    print(f"\n🌾 Agmarknet Live Price Fetcher — {datetime.now().strftime('%d %b %Y %H:%M')}")
    print("=" * 60)

    existing = load_existing_cache()

    # Backup existing cache
    if existing:
        with open(BACKUP_PATH, "w") as f:
            json.dump(existing, f, indent=2)
        print(f"✅ Backed up existing cache to {BACKUP_PATH}")

    print("\n📡 Fetching live prices from agmarknet.gov.in...")
    national_prices = fetch_prices_agmarknet_direct()

    if not national_prices:
        print("\n⚠️  Live fetch returned no data. Trying API endpoints...")
        # Try the MSP API
        msp_data = fetch_prices_via_home_api()
        if msp_data:
            print(f"  Got MSP data: {list(msp_data.keys())[:3]}...")

    fetched_count = len(national_prices)
    print(f"\n📊 Fetched live prices for {fetched_count}/{len(COMMODITY_MAP)} commodities")

    if fetched_count == 0:
        print("\n❌ Could not fetch any live prices. Keeping existing cache.")
        sys.exit(1)

    # Build pincode-level prices
    print("\n🔨 Building per-pincode price table...")
    updated_cache = build_pincode_prices(national_prices, existing)

    # Write output
    with open(OUT_PATH, "w") as f:
        json.dump(updated_cache, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Updated {OUT_PATH}")
    print(f"   Pincodes: {list(updated_cache.keys())}")

    # Show summary
    sample_pin = list(updated_cache.keys())[0]
    print(f"\n📌 Sample prices for {sample_pin}:")
    for crop, p in list(updated_cache[sample_pin].items())[:5]:
        print(f"   {crop:12s}: ₹{p['modal']:,}/q  [min ₹{p['min']:,} – max ₹{p['max']:,}]  source={p.get('source','?')}")


if __name__ == "__main__":
    main()
