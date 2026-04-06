# FastAPI Sport Prediction Service

## Overview

A Python FastAPI service that wraps a trained scikit-learn model and exposes it over HTTP.
The Next.js frontend calls this service to get sport predictions for an athlete.

---

## Directory Structure

```
fastapi/
├── main.py              ← FastAPI app (entry point)
├── requirements.txt     ← Python dependencies
├── .env                 ← ALLOWED_ORIGIN config
├── .venv/               ← virtualenv (Python 3.13, created locally)
└── model/
    ├── sport_model.pkl  ← GradientBoostingClassifier
    ├── scaler.pkl       ← StandardScaler (10 features)
    ← le_sex.pkl       ← LabelEncoder: "M"/"F" → int
    └── le_sport.pkl     ← LabelEncoder: int → sport name string
```

> **Note:** The pkl files were originally named `sport_model-2.pkl` and `scaler-2.pkl`
> in the `tempo/` directory. They were copied and renamed to drop the `-2` suffix.

---

## Setup

### Prerequisites

- Python 3.10+
- `python3-pip` and `python3-venv` installed (`sudo apt-get install python3-pip python3-venv`)

### First-time install

```bash
cd fastapi/
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### Start the server

```bash
cd fastapi/
.venv/bin/uvicorn main:app --reload --port 8000
```

---

## Endpoints

### `GET /health`

Basic liveness check.

**Response:**
```json
{ "status": "ok" }
```

---

### `POST /predict`

Predict the most suitable sport for an athlete.

**Request body:**

| Field    | Type   | Description              | Valid values         |
|----------|--------|--------------------------|----------------------|
| `height` | float  | Height in cm             | e.g. `185`           |
| `weight` | float  | Weight in kg             | e.g. `80`            |
| `age`    | float  | Age in years             | e.g. `22`            |
| `sex`    | string | Biological sex           | `"M"` or `"F"`       |
| `season` | string | Preferred season         | `"Summer"` or `"Winter"` |

**Example request:**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"height": 185, "weight": 80, "age": 22, "sex": "M", "season": "Summer"}'
```

**Example response:**
```json
{
  "predicted_sport": "Football",
  "top3": [
    { "sport": "Football",  "confidence": 38.1 },
    { "sport": "Swimming",  "confidence": 17.3 },
    { "sport": "Cycling",   "confidence": 10.7 }
  ]
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `422`  | Invalid `sex` (not `"M"`/`"F"`) or invalid `season` |
| `500`  | Unexpected prediction error |

---

## Feature Engineering

The model was trained on 10 features. The service computes all derived features
server-side — the frontend only sends the 5 raw inputs.

**Feature order (must match training exactly):**

```
['Height', 'Weight', 'Age', 'Sex_enc', 'BMI', 'Season_enc', 'Age_group', 'Height_sq', 'Weight_cat', 'HW_ratio']
```

**Derivation of each computed feature:**

| Feature      | Formula |
|--------------|---------|
| `Sex_enc`    | `le_sex.transform([sex])[0]` — LabelEncoder |
| `BMI`        | `weight / (height / 100) ** 2` |
| `Season_enc` | `1` if `"Summer"`, else `0` |
| `Age_group`  | `pd.cut(age, bins=[0,20,25,30,35,50], labels=False)` — replicated with `np.searchsorted` |
| `Height_sq`  | `height ** 2` |
| `Weight_cat` | `pd.cut(weight, bins=[0,60,70,80,90,100,200], labels=False)` — replicated with `np.searchsorted` |
| `HW_ratio`   | `height / weight` |

Features are assembled as a named `pd.DataFrame` (not a bare numpy array) so that
column names match what the scaler was fitted with, avoiding scikit-learn warnings.

---

## Environment Variables

Defined in `fastapi/.env`:

| Variable         | Default                  | Description                                 |
|------------------|--------------------------|---------------------------------------------|
| `ALLOWED_ORIGIN` | `http://localhost:3000`  | CORS origin allowed to call the service     |

Change this to your production frontend URL before deploying.

---

## CORS

The service uses `CORSMiddleware`. Only the origin specified in `ALLOWED_ORIGIN`
is permitted. All HTTP methods and headers are allowed from that origin.

---

## Model Details

| Artifact         | Type                        | Notes |
|------------------|-----------------------------|-------|
| `sport_model.pkl`| `GradientBoostingClassifier`| Supports `predict_proba` — top-3 confidence scores are available |
| `scaler.pkl`     | `StandardScaler`            | Fitted on all 10 features with feature names |
| `le_sex.pkl`     | `LabelEncoder`              | Classes: `["F", "M"]` |
| `le_sport.pkl`   | `LabelEncoder`              | Maps encoded int → sport name string |

All four artifacts are loaded **once at startup**. If any file is missing the
server raises a `RuntimeError` immediately with a clear message.

---

## Troubleshooting

**`X has N features, but StandardScaler is expecting 10`**
— The feature array has the wrong number of columns. Ensure all 10 features
are computed and passed in the correct order.

**`ValueError: y contains previously unseen labels`**
— `sex` was not `"M"` or `"F"` (e.g. `"Male"`). The endpoint now validates
this before calling the encoder and returns a `422`.

**`InconsistentVersionWarning` from scikit-learn**
— The pkl files were saved with scikit-learn 1.6.1 but the venv has 1.8.0.
Predictions still work; re-train and re-export to eliminate the warning permanently.
