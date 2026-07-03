# 🌾 FunctionalAgro (FunctionalAgro)

**AI Advisory & Market Negotiation for Every Indian Farmer**

FunctionalAgro is a comprehensive, AI-powered agricultural assistant designed to empower farmers with real-time disease diagnosis, multilingual advisory, and live market price negotiations.

---

## 🌟 Key Features

### 🔍 AI Crop Diagnosis & Advisory
- **Image Upload:** Upload a photo of a diseased crop. The system uses a local PlantVillage MobileNet V2 model to instantly identify the disease (with a seamless fallback to a robust Demo Mode if dependencies are missing).
- **Multilingual Support:** Communicate via text or voice in 7+ Indian languages (Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, English).
- **Voice-to-Voice AI:** Powered by **Gemini 1.5 Flash**, the app transcribes the farmer's voice, translates it, generates an expert agricultural advisory, and returns text-to-speech (TTS) audio in the farmer's native language.

### 🤝 AI Dalal (Trader Negotiation)
- Negotiate crop prices with three distinct AI trader personas: *Premium Vikram*, *Fair Suresh*, and *Shrewd Ramesh*.
- **Live Agmarknet Data:** Pulls real-time market prices directly from the Government of India's Agmarknet portal. 
- Bids are dynamically calculated based on live modal/min/max prices and localized transport costs based on the farmer's pincode.

### 🌍 Outbreak Radar & AIKosh Zones
- **Agro-Climatic Zones:** Uses AIKosh data to map pincodes to local agro-ecological zones and recommend suitable crops.
- **Outbreak Tracking:** Every diagnosis is geotagged in a local SQLite database to track disease outbreaks in real-time.

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite (Vanilla CSS with a premium dark-mode UI).
- **Backend:** FastAPI (Python), SQLAlchemy, SQLite.
- **AI/ML:** Google Gemini (google-genai / google-generativeai), HuggingFace Transformers (MobileNet V2).
- **APIs/Data:** Agmarknet Live Scraper, Deep-Translator, gTTS (Google Text-to-Speech).

---

## 🚀 Getting Started

### Prerequisites
1. Node.js (v18+)
2. Python (3.10+)
3. A Google Gemini API Key

### Installation & Setup

1. **Environment Variables:**
   - Copy the `.env.example` file to `.env` in the root directory.
   - Add your Gemini API key: `GEMINI_API_KEY="your_actual_key_here"`

2. **Run the Application:**
   - On Windows, simply double-click **`run.bat`**
   - This script will automatically:
     - Boot up the FastAPI backend on `http://localhost:8000`
     - Start the React Vite frontend on `http://localhost:5173`
     - Open the web application in your default browser.

### Robust Graceful Fallbacks
The application is designed to be highly resilient for demos. If the Gemini API rate limits are hit, or if heavy ML models fail to load locally, the backend endpoints (`/api/advise`, `/api/farmer-input`, `/api/dalal`) automatically catch the exceptions and seamlessly fall back to high-quality **Demo Mode** responses. This guarantees the UI never breaks during a presentation.

---
*Built for the future of Indian Agriculture.*
