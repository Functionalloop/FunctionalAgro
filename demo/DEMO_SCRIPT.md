# FunctionalAgro — Demo Script
## One scripted, rehearsed demo path. Nothing live. Everything cached.

---

## Pre-Demo Checklist (run 30 min before judging)

```powershell
# 1. Install backend deps (first time only)
cd backend
pip install -r requirements.txt

# 2. Download model (first time only — caches to HuggingFace hub)
cd ..
python data/download_model.py

# 3. Seed the database
python data/seed_diagnoses.py

# 4. Copy .env.example to .env and fill Gemini key
cp .env.example .env
# Edit .env → add GEMINI_API_KEY=your_key

# 5. Verify cache files exist
Test-Path data/pincode_zone_crops.json    # should be True
Test-Path data/agmarknet_cache.json       # should be True
Test-Path models/disease_classes.json     # should be True

# 6. Start backend
uvicorn backend.main:app --reload --port 8000

# 7. Start frontend (separate terminal)
cd frontend
npm install   # first time only
npm run dev   # opens at http://localhost:5173
```

---

## Demo Flow (≈ 90 seconds on stage)

### Step 1 — Upload & Diagnose (20 sec)
- Open `http://localhost:5173`
- **Click** the upload zone → select `demo/sample_tomato_blight.jpg`
- Enter pincode: **560001**
- Language: **हिंदी (Hindi)**
- Click **"Diagnose & Get Advisory"**
- Wait ~5 seconds

### Step 2 — Show Results (20 sec)
- **Result card appears:**
  - 🌿 "Tomato — Late Blight · 92% confidence"
  - 🔴 High Risk badge
- **Zone card:** "Southern Plateau and Hills · Red Laterite soil · Ragi, Groundnut…"
- **Advisory card in Hindi** → click **🔊 Play Audio**
  - Audio plays Bhashini-translated advisory in Hindi

### Step 3 — Outbreak Fires (10 sec)
- 🚨 **Red pulsing OUTBREAK ALERT banner** appears at top
  - "4 cases of Late Blight in Tomato near pincode 560001 in the last 7 days!"
- Say: *"Every diagnosis from any farmer anonymously contributes to this crowd-sourced map."*
- **Radar tab** — red notification dot visible

### Step 4 — Outbreak Map (15 sec)
- Click **Outbreak Radar** tab
- Map shows **two red circles**: 560001 (Tomato Blight) + 411001 (Potato Blight)
- Click a circle → popup: "🚨 OUTBREAK · Tomato — Late Blight · Bangalore Urban · 4 cases"
- Stats: 2 Active Outbreaks · 2 Zones · 7 Reports

### Step 5 — AI Dalal (25 sec)
- Click **AI Dalal** tab (or click "Open AI Dalal →" CTA at bottom of results)
- Crop: **Tomato** · Qty: **50** quintals · Pincode: **560001**
- Click **"Get Best Price"**
- Wait ~10 seconds
- 3 bids appear with animation:
  - 🤑 Shrewd Ramesh: ₹1,660/q — low-ball pitch
  - 🤝 Fair Suresh: ₹2,040/q — cooperative fair price
  - 💎 Premium Vikram: ₹2,240/q — export house premium
- **Best Deal card:**
  - 🏆 **₹2,240/quintal** from Premium Vikram
  - Total: **₹1,12,000** for 50 quintals
- **Red warning box:** "Disease outbreak detected — sell now, prices may fall next week"

---

## Pitch Line for Judges

> *"FunctionalAgro uses real government infrastructure — **AIKosh** for agro-climatic zone data,
> **Bhashini** for multilingual voice advisory, and **Agmarknet** for price anchoring —
> powered by **Google Gemini** — with two features even established platforms skip:
> **crowd-sourced outbreak detection** from anonymous diagnosis data,
> and **AI price negotiation** that tells a farmer whether to sell today or wait."*

---

## Backup Plan

If Gemini API is slow or down:
- `/advise` has a hardcoded healthy-plant path (no LLM call)
- `/dalal-negotiate` has `expected_bid` fallback that bypasses Gemini and returns calculated prices
- Model has mock mode — always returns "Tomato Late Blight 92%" if model file not found

Everything external is cached locally. No live scraping during judging.
