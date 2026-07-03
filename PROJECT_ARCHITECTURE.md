# FunctionalAgro (FunctionalAgro) — Project Architecture & Overview

This document provides a comprehensive technical overview of the **FunctionalAgro** platform, detailing its features, system architecture, data flows, and technologies used. 

---

## 1. Executive Summary
FunctionalAgro is an advanced, AI-driven agricultural advisory and market negotiation platform built to empower Indian farmers. Designed with edge-case resilience and rural connectivity in mind, the platform leverages state-of-the-art Generative AI, On-Device Machine Learning (Edge AI), and live government datasets to deliver multilingual, weather-aware, and highly localized insights directly to the farmer.

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

### 🔔 Firebase Authentication & Market Alerts
- **Technology:** Firebase Auth + Firestore + FastAPI Background Tasks
- **Functionality:** Farmers authenticate securely using Google. They can subscribe to SMS/WhatsApp alerts for specific crop prices. A backend cron job (`price_monitor.py`) runs daily, fetching live Agmarknet prices, querying Firestore for user thresholds, and triggering dispatch alerts when target prices are met.

### 📶 Progressive Web App (PWA) Offline Mode
- **Technology:** `vite-plugin-pwa`
- **Functionality:** The platform is a fully installable PWA. Critical assets and fallback data (like the ICAR Agro-Climatic Zone JSON) are aggressively cached by service workers, allowing the app to function even when the farmer loses cellular connection in the field.

---

## 3. System Architecture & Tech Stack

### Frontend (React + Vite)
- **Styling:** Vanilla CSS with custom CSS variables for a premium Dark Mode aesthetic.
- **State Management:** React Hooks (`useState`, `useEffect`).
- **Edge Inference:** TensorFlow.js
- **Auth:** Firebase Authentication (`firebase/auth`)

### Backend (FastAPI / Python)
- **Framework:** FastAPI for high-performance, asynchronous endpoints.
- **Database (Transactional):** SQLite + SQLAlchemy (`functionalagro.db` for Outbreak logs).
- **Database (Users):** Firebase Admin SDK + Firestore (for Profiles & Alerts).
- **AI Integration:** `google-genai` / `google-generativeai` SDKs with highly resilient `try/except` fallback mechanisms (Demo Mode) to prevent crashes if the API rate-limits.
- **Background Tasks:** `asyncio` for the scheduled price monitor.

### Data Sources
- **ICAR AIKosh Zones:** Local JSON mapping 130+ anchor pincodes to Indian Agro-Ecological zones, soil types, and recommended crops. Uses 3-digit fuzzy matching to support *every* pincode in India.
- **Agmarknet:** Real-time mandis market prices.
- **Open-Meteo:** Free, coordinate-based weather API.

---

## 4. Directory Structure

```text
FunctionalAgro/
├── backend/
│   ├── main.py                 # FastAPI entry point & routers
│   ├── database.py             # SQLite setup for Outbreak Radar
│   ├── firebase_app.py         # Firebase Admin SDK initialization & auth dependency
│   ├── routes/                 # API Endpoints (diagnose, advise, dalal, recommend, alerts, etc.)
│   ├── tasks/                  # Background tasks (price_monitor.py)
│   └── serviceAccountKey.json  # Firebase Admin credentials
├── frontend/
│   ├── index.html              # Vite entry point
│   ├── package.json            # NPM dependencies (tfjs, firebase, axios, etc.)
│   ├── vite.config.js          # PWA plugin configuration
│   └── src/
│       ├── App.jsx             # Main UI layout & Routing tabs
│       ├── firebase.js         # Firebase client config
│       ├── index.css           # Global premium styling
│       └── components/         # React Components (DiagnosePanel, DalalChat, FarmerView, etc.)
├── data/                       # Local JSON datasets (AIKosh zones, Agmarknet cache, Subsidies)
├── models/                     # Disease classification mapping rules
└── run.bat                     # Windows deployment script
```

---

## 5. Resilience & "Demo Mode"
The application is engineered to be bulletproof during live demonstrations. 
Every critical dependency (Gemini LLM, HuggingFace Models, Live Scrapers) is wrapped in a graceful fallback mechanism. If the internet drops, an API key expires, or a rate limit is hit, the backend catches the exception and returns a high-quality "Mock" response. The frontend UI will never crash, ensuring a seamless experience for end-users.
