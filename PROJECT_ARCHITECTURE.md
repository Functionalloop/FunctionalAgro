# FunctionalAgro — Project Architecture & Overview

This document provides a comprehensive technical overview of the **FunctionalAgro** platform, detailing its features, system architecture, data flows, deployment strategy, and technologies used.

---

## 1. Executive Summary
FunctionalAgro is an advanced, AI-driven agricultural advisory and market negotiation platform built to empower Indian farmers. Designed with edge-case resilience and rural connectivity in mind, the platform leverages state-of-the-art Generative AI, On-Device Machine Learning (Edge AI), and live government datasets to deliver multilingual, weather-aware, and highly localized insights directly to the farmer.

**Production Deployment:**
- 🌐 **Frontend:** Hosted on [Vercel](https://vercel.com) — auto-deploys on every push to `main`.
- ⚙️ **Backend:** Hosted on [Render](https://render.com) — Python web service (`render.yaml` at root).

---

## 2. Core Features

### 🌾 Edge AI: Instant Crop Diagnosis
- **Technology:** `@tensorflow/tfjs` and `@tensorflow-models/mobilenet`
- **Functionality:** When a farmer selects a photo of a diseased crop, the inference is run **locally in the browser**. This completely eliminates the need to upload heavy image files over slow 3G rural networks, providing an instantaneous diagnosis.

### 🌤️ Weather-Aware AI Advisory
- **Technology:** Google Gemini 1.5 Flash API + Open-Meteo API
- **Functionality:** Based on the farmer's pincode, the backend fetches a live 3-day weather forecast. This forecast is dynamically injected into the Gemini LLM prompt, allowing the AI to generate hyper-localized advice (e.g., advising a farmer to delay spraying fungicide because heavy rain is expected tomorrow).

### 🗣️ Multilingual Voice-to-Voice LLM
- **Technology:** `deep-translator`, `gTTS` (Google Text-to-Speech), Gemini
- **Functionality:** Farmers can interact with the app in 7+ Indian languages. Their text/voice input is translated to English, processed by the Gemini agricultural expert persona, translated back to their native language, and returned as an audio file for illiterate farmers to listen to.

### 🤝 AI Dalal (Trader Negotiation)
- **Technology:** Live Government Data Scraper (Agmarknet) + Gemini Personas
- **Functionality:** The backend scrapes live market modal/min/max prices for specific crops across India. Farmers can negotiate their crop sales with three distinct AI trader personas (*Premium Vikram, Fair Suresh, Shrewd Ramesh*). The AI bids are dynamically constrained by the real-time scraped market rates and simulated localized transport costs.

### 🚨 Outbreak Radar
- **Technology:** SQLite Geotagging + Leaflet Maps
- **Functionality:** Every time a farmer diagnoses a crop (even via Edge AI), a lightweight, anonymous JSON payload (crop, disease, pincode) is logged to the local SQLite database. This data is aggregated and displayed on a live map, allowing authorities and farmers to track disease outbreaks spreading across regions in real-time.

### 🏗️ Agri Infra Fund (AIF) Map
- **Technology:** Static JSON + Leaflet Maps
- **Functionality:** Displays geolocation data of approved Agri Infrastructure Fund projects across India (from Ministry of Agriculture data), helping farmers discover nearby cold storage, warehouses, and processing units eligible for government subsidies.

### 💰 MSP vs Dalal Profit Calculator
- **Technology:** FastAPI `/api/profit-calc` + MSP JSON dataset
- **Functionality:** Farmers input their crop, acreage, yield per acre, and selling price to compare net profit across three channels: Government MSP, AI Dalal bid, and Open Market. Displays breakeven analysis and actionable insight.

### 🔔 Firebase Authentication & Market Alerts
- **Technology:** Firebase Auth (Google Sign-In) + Firestore + FastAPI Background Tasks
- **Functionality:** Farmers authenticate securely using Google Sign-In. They can subscribe to price alerts for specific crops. A backend async task (`price_monitor.py`) runs daily, querying Firestore for user thresholds and dispatching alerts when target prices are met.

### 📶 Progressive Web App (PWA) Offline Mode
- **Technology:** `vite-plugin-pwa`
- **Functionality:** The platform is a fully installable PWA. Critical assets and fallback data (like the ICAR Agro-Climatic Zone JSON) are aggressively cached by service workers, allowing the app to function even when the farmer loses cellular connection in the field.

---

## 3. System Architecture & Tech Stack

### Frontend (React + Vite) — Hosted on Vercel
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Styling | Vanilla CSS, Custom CSS Variables, Dark Mode |
| State Management | React Hooks (`useState`, `useEffect`) |
| Edge Inference | TensorFlow.js + MobileNet |
| Auth | Firebase Authentication (`firebase/auth`) |
| Maps | React-Leaflet + OpenStreetMap tiles |
| HTTP | Axios |
| API URL | Centralized `src/api.js` — auto-normalizes `VITE_API_URL` env var |

### Backend (FastAPI / Python) — Hosted on Render
| Layer | Technology |
|---|---|
| Framework | FastAPI + Uvicorn (ASGI) |
| Database (Outbreak) | SQLite + SQLAlchemy (`backend/functionalagro.db`) |
| Database (Users) | Firebase Admin SDK + Firestore |
| AI / LLM | Google Gemini 1.5 Flash (`google-generativeai`) |
| Translation | Bhashini Dhruva API (fallback: `deep-translator`) |
| TTS | gTTS (Google Text-to-Speech) |
| Background Tasks | `asyncio` (price_monitor scheduled loop) |
| Static Files | FastAPI `StaticFiles` mount at `/audio` for TTS MP3s |
| CORS | `CORSMiddleware`, `allow_origins=["*"]` |

### Data Sources
| Source | Usage |
|---|---|
| ICAR AIKosh | 130+ anchor pincodes → Agro-Ecological zones, soil types, recommended crops |
| Agmarknet | Real-time mandi crop prices (scraper in `live_prices.py`) |
| Open-Meteo | Free coordinate-based weather forecast (no API key needed) |
| Ministry of Agriculture (AIF) | Agri Infrastructure Fund project geodata (`aif_geo_projects.json`) |
| Government MSP Data | Minimum Support Prices for 25+ crops (`msp_data.json`) |
| APEDA / District Zone Lookup | District → Agro-Climatic Zone mapping (`district_zone_lookup.json`) |

---

## 4. Directory Structure

```text
FunctionalAgro/                         ← Monorepo root
├── render.yaml                         # Render deployment config (backend)
├── Procfile                            # Alternative start command for cloud PaaS
├── requirements.txt                    # Root requirements (mirrors backend/requirements.txt)
├── .env                                # Local environment variables (never committed)
├── .env.example                        # Template for required env vars
│
├── backend/
│   ├── main.py                         # FastAPI entry point, routers, CORS, startup
│   ├── database.py                     # SQLite setup for Outbreak Radar
│   ├── firebase_app.py                 # Firebase Admin SDK init (env var + file fallback)
│   ├── language.py                     # Translation (Bhashini → deep-translator) + gTTS TTS
│   ├── requirements.txt                # Python dependencies
│   ├── routes/
│   │   ├── diagnose.py                 # POST /api/diagnose — Gemini Vision crop diagnosis
│   │   ├── advise.py                   # POST /api/advise — weather-aware advisory + TTS
│   │   ├── recommend.py                # GET  /api/recommend-crop — zone-based crop suggestions
│   │   ├── outbreak.py                 # GET  /api/outbreak-check, /api/outbreak-map
│   │   ├── dalal.py                    # POST /api/dalal-negotiate — AI trader personas
│   │   ├── farmer_input.py             # POST /api/farmer-input — WhatsApp/SMS gateway
│   │   ├── live_prices.py              # GET  /api/live-prices — Agmarknet scraper
│   │   ├── alerts.py                   # POST /api/alerts/subscribe — Firestore price alerts
│   │   ├── aif_map.py                  # GET  /api/aif-map — Agri Infra Fund geo data
│   │   ├── profit_calc.py              # POST /api/profit-calc — MSP vs Dalal comparison
│   │   └── whatsapp.py                 # WhatsApp webhook integration
│   └── tasks/
│       └── price_monitor.py            # Async background cron — daily price alert dispatcher
│
├── frontend/
│   ├── index.html
│   ├── package.json                    # NPM deps (tfjs, firebase, axios, leaflet, etc.)
│   ├── vite.config.js                  # Vite + PWA plugin config
│   └── src/
│       ├── App.jsx                     # Main layout, Firebase auth, scroll-based nav
│       ├── api.js                      # Centralized API URL (auto-normalizes VITE_API_URL)
│       ├── firebase.js                 # Firebase client SDK config (safe analytics init)
│       ├── index.css                   # Global premium dark-mode stylesheet
│       └── components/
│           ├── DiagnosePanel.jsx       # Crop photo upload + TF.js edge inference
│           ├── ResultBubble.jsx        # Diagnosis result card + TTS audio playback
│           ├── DalalChat.jsx           # AI Dalal negotiation chat interface
│           ├── FarmerView.jsx          # Mobile-first farmer dashboard + WhatsApp bot
│           ├── MapPanel.jsx            # Leaflet outbreak radar map
│           ├── ProfitCalc.jsx          # MSP vs Dalal profit calculator UI
│           ├── Hero.jsx                # Landing hero section
│           ├── BentoGrid.jsx           # Feature bento grid overview
│           └── OutbreakBanner.jsx      # Sticky outbreak alert notification banner
│
├── data/
│   ├── district_zone_lookup.json       # District → Agro-Climatic zone mapping
│   ├── aif_geo_projects.json           # AIF project geolocations
│   ├── agri_infra_schemes.json         # Government agri scheme details
│   ├── msp_data.json                   # MSP for 25+ crops (FY2024-25)
│   └── raw/                            # Raw CSVs from government portals
│
├── models/                             # ML model weights (not committed, download separately)
├── static/audio/                       # Runtime-generated TTS audio files (not committed)
└── graphify-out/                       # Codebase analysis output (Graphify tool)
```

---

## 5. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check + endpoint listing |
| `POST` | `/api/diagnose` | Gemini Vision crop disease diagnosis (image upload) |
| `POST` | `/api/diagnose-log` | Edge AI result logging (JSON, no image upload) |
| `POST` | `/api/advise` | Weather-aware Gemini advisory + multilingual TTS |
| `GET` | `/api/recommend-crop` | Zone-based crop recommendations (pincode or district) |
| `GET` | `/api/outbreak-check` | Outbreak detection for a given pincode |
| `GET` | `/api/outbreak-map` | All geotagged diagnoses for Leaflet map |
| `POST` | `/api/dalal-negotiate` | AI Dalal trader negotiation |
| `POST` | `/api/farmer-input` | WhatsApp/SMS farmer query handler |
| `GET` | `/api/live-prices` | Live Agmarknet crop prices |
| `GET` | `/api/live-prices/refresh` | Force-refresh price cache |
| `GET` | `/api/live-prices/summary` | Price summary statistics |
| `GET` | `/api/aif-map` | Agri Infra Fund project geo data |
| `GET` | `/api/aif-summary` | AIF scheme summary stats |
| `POST` | `/api/profit-calc` | MSP vs Dalal vs Market profit comparison |
| `POST` | `/api/alerts/subscribe` | Subscribe to crop price SMS alerts (requires Firebase auth) |

---

## 6. Deployment Configuration

### Backend (Render)
Configured via `render.yaml` at repo root:
- **Build Command:** `pip install -r backend/requirements.txt`
- **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Python Version:** 3.10
- **Required Environment Variables:**
  | Key | Description |
  |---|---|
  | `GEMINI_API_KEY` | Google AI Studio API key |
  | `DEMO_MODE` | `"false"` in production, `"true"` to bypass LLM calls |
  | `FIREBASE_SERVICE_ACCOUNT` | Full `serviceAccountKey.json` JSON (as string) — **optional**, enables Firestore alerts |
  | `PYTHONPATH` | `"."` — ensures `backend.*` imports resolve from repo root |

### Frontend (Vercel)
- Auto-deploys from `frontend/` subdirectory on push to `main`.
- **Required Environment Variables:**
  | Key | Description |
  |---|---|
  | `VITE_API_URL` | Render backend URL, e.g. `https://functionalagro.onrender.com/api` |
  | `VITE_DEMO_MODE` | `"false"` in production |
- **Firebase Authorized Domains:** Add your Vercel domain in [Firebase Console → Authentication → Settings → Authorized Domains](https://console.firebase.google.com/project/functionalagro/authentication/settings)

---

## 7. Resilience & "Demo Mode"
The application is engineered to be bulletproof during live demonstrations.

Every critical dependency is wrapped in a graceful fallback:
- **Gemini LLM unavailable** → Returns high-quality hardcoded mock response
- **Agmarknet scraper fails** → Falls back to cached MSP price data
- **Firebase Admin not configured** → Auth endpoints return `503`; all other endpoints work normally
- **Firebase Analytics unsupported** → Safely skipped; never blocks auth initialization
- **gTTS fails** → Audio field returns `null`; text response still delivered
- **Bhashini API unavailable** → Falls back to `deep-translator` (Google Translate)

The frontend UI **never crashes** regardless of backend state.
