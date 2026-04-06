# Athlete Sport Predictor — Project Documentation

## Overview

A web application that predicts the most suitable sport for an athlete based on their physical profile. The user enters their measurements, and an XGBoost machine learning model returns the top 3 sport matches ranked by fit.

---

## Architecture

```
Browser
  ↓  submits form
Next.js frontend (port 3000)
  ↓  POST /api/analyze
Next.js API route (app/api/analyze/route.ts)
  ↓  POST http://localhost:8000/predict
FastAPI service (port 8000)
  ↓  loads XGBoost model from pkl files
  ↑  returns predicted sport + top 3 match scores
Next.js renders ResultsPanel
```

Both services run on the same Linux server, managed by PM2.

---

## Services

### Next.js — Frontend & API proxy

| Item | Value |
|---|---|
| Port | 3000 |
| PM2 name | `next-dev` |
| Entry point | `app/page.tsx` |
| Framework | Next.js 16 (Turbopack) |

Serves the UI and proxies prediction requests to FastAPI. Does not talk to the ML model directly.

### FastAPI — ML Prediction Service

| Item | Value |
|---|---|
| Port | 8000 |
| PM2 name | `fastapi` |
| Entry point | `fastapi/main.py` |
| Runtime | Python 3.13, virtualenv at `fastapi/.venv` |

Loads the trained XGBoost model at startup and exposes a prediction endpoint.

---

## Project Structure

```
performance-analyzer/
├── app/
│   ├── page.tsx                  ← Main UI page
│   ├── layout.tsx                ← Root layout, fonts, globals
│   ├── globals.css               ← CSS variables, theme
│   └── api/analyze/route.ts      ← API route: proxies to FastAPI
├── components/
│   ├── MetricForm.tsx            ← Athlete input form
│   └── ResultsPanel.tsx          ← Top-3 results with match score bars
├── types/
│   └── index.ts                  ← TypeScript interfaces
├── fastapi/
│   ├── main.py                   ← FastAPI app, feature engineering, prediction
│   ├── requirements.txt          ← Python dependencies
│   ├── .env                      ← ALLOWED_ORIGIN config
│   ├── .venv/                    ← Python virtualenv
│   └── model/
│       ├── sport_model.pkl       ← XGBoost classifier
│       ├── scaler.pkl            ← StandardScaler (10 features)
│       ├── le_sex.pkl            ← LabelEncoder: "M"/"F" → int
│       └── le_sport.pkl          ← LabelEncoder: int → sport name
└── docs/
    ├── project.md                ← This file
    └── fastapi-service.md        ← FastAPI technical reference
```

---

## User Input Fields

| Field | Type | Values |
|---|---|---|
| Age | number | 10–80 years |
| Biological Sex | select | Male (`M`) / Female (`F`) |
| Season | select | Summer / Winter |
| Height | number | 100–250 cm |
| Weight | number | 30–200 kg |

---

## ML Model

### Sports the model predicts
`Basketball, Football, Swimming, Boxing, Cycling, Volleyball`

### Feature engineering
The model was trained on 10 features. The FastAPI service derives all of them from the 5 raw inputs:

| Feature | Derivation |
|---|---|
| `Height` | raw input |
| `Weight` | raw input |
| `Age` | raw input |
| `Sex_enc` | LabelEncoder on `"M"`/`"F"` |
| `BMI` | `weight / (height / 100) ** 2` |
| `Season_enc` | `1` = Summer, `0` = Winter |
| `Age_group` | `pd.cut(age, bins=[0,20,25,30,35,50], labels=False)` |
| `Height_sq` | `height ** 2` |
| `Weight_cat` | `pd.cut(weight, bins=[0,60,70,80,90,100,200], labels=False)` |
| `HW_ratio` | `height / weight` |

### Match Score
Raw `predict_proba` output is temperature-sharpened (`T = 0.7`) before display so scores feel meaningful to users. The label in the UI is **Match Score**, not "Confidence", to reflect this. Ranking is preserved — sharpening does not change which sport comes first.

### Known limitation — class imbalance
The training dataset has more Swimming and Cycling records than other sports. This means the model is biased toward those sports for average athletic profiles. It predicts clearly at physical extremes (e.g. 206cm/113kg → Basketball). Rebalancing the training data is the recommended next improvement.

| Sport | Training records |
|---|---|
| Swimming | 23,195 |
| Cycling | 10,859 |
| Football | 6,745 |
| Boxing | 6,047 |
| Basketball | 4,536 |
| Volleyball | 3,404 |

---

## Running the Project

### Check service status
```bash
pm2 list
```

Both `next-dev` and `fastapi` should show `online`.

### Restart a service
```bash
pm2 restart next-dev
pm2 restart fastapi
```

### View logs
```bash
pm2 logs next-dev
pm2 logs fastapi
```

### Start from scratch (if PM2 has no saved processes)
```bash
# Next.js
cd /home/san/performance-analyzer
pm2 start node_modules/next/dist/bin/next --name "next-dev" -- dev

# FastAPI
pm2 start /home/san/performance-analyzer/fastapi/.venv/bin/uvicorn \
  --name "fastapi" \
  --interpreter /home/san/performance-analyzer/fastapi/.venv/bin/python3 \
  --cwd /home/san/performance-analyzer/fastapi \
  -- main:app --host 0.0.0.0 --port 8000

pm2 save
```

---

## Updating the ML Model

When new `.pkl` files are available:

1. Drop the 4 files into `fastapi/model/`:
   ```
   sport_model.pkl
   scaler.pkl
   le_sex.pkl
   le_sport.pkl
   ```

2. Verify the feature engineering hasn't changed (check `fastapi/main.py` feature_cols list matches training)

3. Restart FastAPI:
   ```bash
   pm2 restart fastapi
   ```

---

## Pointing to a Remote FastAPI

If the FastAPI service moves to a remote server (e.g. a teammate's deployment), change one line in `app/api/analyze/route.ts`:

```ts
const response = await fetch("https://remote-service-url.com/predict", {
```

No other changes needed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| API proxy | Next.js Route Handler |
| ML service | FastAPI, uvicorn |
| Model | XGBoost (scikit-learn pipeline) |
| Process manager | PM2 |
| Package manager | pnpm |
| Language (frontend) | TypeScript |
| Language (backend) | Python 3.13 |
