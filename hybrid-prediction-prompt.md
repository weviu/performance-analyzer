# Hybrid Two-Stage Sport Prediction — FastAPI + Next.js Update Prompt

## Context

We have a working athlete performance analyzer with two services:
1. **FastAPI** (`/performance-analyzer/fastapi/`) — ML prediction service on port 8000
2. **Next.js** (`/performance-analyzer/`) — frontend on port 3000

The ML model has been upgraded. We are now implementing a **two-stage hybrid
prediction system**:

**Stage 1 — ML Model**
Predicts a sport *category* from physical attributes.
Returns the predicted group + top-3 group probabilities.

**Stage 2 — Physics-based matching**
Within the predicted category, ranks individual sports by how closely
the athlete's physical profile matches Olympic benchmarks from
`/lib/sportBenchmarks.json`. No ML — pure math.

---

## New pkl Files

The coworker has provided 3 new pkl files. Place them in `/fastapi/model/`:
- `sport_model-4.pkl` — the trained classifier (XGBoost/RandomForest)
- `label_encoder.pkl` — encodes/decodes sport group labels
- `feature_cols.pkl` — the exact list of feature column names used during training

**Important:**
- There is NO scaler — raw feature values go directly into the model
- The old `sport_model.pkl`, `scaler.pkl`, `le_sex.pkl`, `le_sport.pkl` are replaced by these 3 files
- Delete the old pkl files from `/fastapi/model/` to avoid confusion

---

## Sport Category Mapping

This is used in Stage 2 to know which individual sports belong to each group:

```python
SPORT_GROUPS = {
    "Ball":       ["Basketball", "Football", "Handball", "Volleyball", "Baseball",
                   "Softball", "Ice Hockey", "Hockey", "Water Polo", "Rugby",
                   "Rugby Sevens", "Tennis", "Table Tennis", "Badminton"],
    "Endurance":  ["Athletics", "Cycling", "Rowing", "Cross Country Skiing",
                   "Alpine Skiing", "Ski Jumping", "Nordic Combined", "Biathlon",
                   "Modern Pentathlon", "Triathlon", "Speed Skating",
                   "Short Track Speed Skating", "Luge", "Bobsleigh", "Skeleton"],
    "Water":      ["Diving", "Canoeing", "Sailing", "Swimming"],
    "Combat":     ["Boxing", "Judo", "Wrestling", "Taekwondo", "Fencing"],
    "Precision":  ["Archery", "Shooting", "Golf"],
    "Strength":   ["Weightlifting"],
    "Gymnastics": ["Gymnastics", "Rhythmic Gymnastics", "Trampolining"],
    "Art":        ["Figure Skating", "Synchronized Swimming"],
    "Skill":      ["Equestrianism", "Art Competitions"],
    "Other":      []
}
```

---

## Feature Engineering

The model expects these features in this exact order (loaded from `feature_cols.pkl`).
FastAPI must compute ALL of these from the 5 raw inputs before predicting:

```python
# Raw inputs from request:
# height (cm), weight (kg), age (years), sex ("M"/"F"), season ("Summer"/"Winter")

Sex_enc     = 1 if sex == "M" else 0
BMI         = weight / ((height / 100) ** 2)
Age_group   = pd.cut([age], bins=[0,20,25,30,35,50], labels=False)[0]
Height_sq   = height ** 2
Weight_cat  = pd.cut([weight], bins=[0,60,70,80,90,100,200], labels=False)[0]
HW_ratio    = height / weight
Season_enc  = 1 if season == "Summer" else 0

# Power_Index and BMI_x_Age (she likely added these — confirm from feature_cols.pkl)
Power_Index = (weight * height) / 1000
BMI_x_Age   = BMI * age
Weight_to_Height = weight / height
```

**CRITICAL**: After loading `feature_cols.pkl`, print its contents and verify the
exact feature list and order. Build the numpy array to match that order exactly.
Do not assume — read the file first.

---

## New API Response Format

```json
{
  "sport_group": "Combat",
  "group_confidence": 84.2,
  "top_groups": [
    { "group": "Combat", "confidence": 84.2 },
    { "group": "Strength", "confidence": 10.1 },
    { "group": "Endurance", "confidence": 5.7 }
  ],
  "top3_sports": [
    {
      "rank": 1,
      "sport": "Wrestling",
      "match_score": 78.4,
      "avg_height": 174.2,
      "avg_weight": 80.1,
      "height_diff": 3.2,
      "weight_diff": -2.1
    },
    {
      "rank": 2,
      "sport": "Boxing",
      "match_score": 71.1,
      "avg_height": 178.5,
      "avg_weight": 75.3,
      "height_diff": -1.3,
      "weight_diff": 2.6
    },
    {
      "rank": 3,
      "sport": "Judo",
      "match_score": 65.3,
      "avg_height": 172.1,
      "avg_weight": 82.4,
      "height_diff": 5.1,
      "weight_diff": -4.5
    }
  ]
}
```

---

---

# PART 1 — FastAPI Updates

> Location: `/performance-analyzer/fastapi/`
> Use Python, no pnpm/npm.

---

## Step 1 — Update Model Loading

Open `main.py`. Replace the existing model loading block at startup with:

```python
import joblib
import json
import numpy as np
import pandas as pd
from pathlib import Path

MODEL_DIR = Path("model")

# Load new pkl files
sport_model  = joblib.load(MODEL_DIR / "sport_model-4.pkl")
label_encoder = joblib.load(MODEL_DIR / "label_encoder.pkl")
feature_cols  = joblib.load(MODEL_DIR / "feature_cols.pkl")

# Load sport benchmarks for Stage 2
with open("../lib/sportBenchmarks.json", "r") as f:
    sport_benchmarks = json.load(f)

print("Feature columns:", feature_cols)
print("Label classes:", label_encoder.classes_)
print("Models loaded successfully.")
```

If the relative path `../lib/sportBenchmarks.json` doesn't resolve correctly,
use an absolute path or copy `sportBenchmarks.json` into the `/fastapi/` directory.

**Stop after this step. Run `uvicorn main:app --reload` and confirm all 3 pkl
files load without errors and feature_cols prints correctly.**

---

## Step 2 — Update Request Model

Replace the existing `AthleteInput` Pydantic model with:

```python
from pydantic import BaseModel, Field

class AthleteInput(BaseModel):
    height: float = Field(..., ge=100, le=250, description="Height in cm")
    weight: float = Field(..., ge=30,  le=200, description="Weight in kg")
    age:    float = Field(..., ge=10,  le=80,  description="Age in years")
    sex:    str   = Field(..., pattern="^(M|F)$", description="M or F")
    season: str   = Field(..., pattern="^(Summer|Winter)$")
```

---

## Step 3 — Feature Engineering Function

Add this function to `main.py` before the route definitions:

```python
def build_features(input: AthleteInput) -> np.ndarray:
    sex_enc    = 1 if input.sex == "M" else 0
    season_enc = 1 if input.season == "Summer" else 0
    bmi        = input.weight / ((input.height / 100) ** 2)
    age_group  = float(pd.cut([input.age],  bins=[0,20,25,30,35,50], labels=False)[0])
    weight_cat = float(pd.cut([input.weight], bins=[0,60,70,80,90,100,200], labels=False)[0])
    height_sq  = input.height ** 2
    hw_ratio   = input.height / input.weight
    power_index      = (input.weight * input.height) / 1000
    bmi_x_age        = bmi * input.age
    weight_to_height = input.weight / input.height

    # Build dict matching feature names
    feature_dict = {
        "Height":           input.height,
        "Weight":           input.weight,
        "Age":              input.age,
        "Sex_enc":          sex_enc,
        "BMI":              bmi,
        "Season_enc":       season_enc,
        "Age_group":        age_group,
        "Height_sq":        height_sq,
        "Weight_cat":       weight_cat,
        "HW_ratio":         hw_ratio,
        "Power_Index":      power_index,
        "BMI_x_Age":        bmi_x_age,
        "Weight_to_Height": weight_to_height,
    }

    # Build array in the exact order feature_cols specifies
    values = [feature_dict[col] for col in feature_cols]
    return np.array([values])
```

**CRITICAL**: If `build_features` throws a KeyError, it means `feature_cols.pkl`
contains a feature name not in `feature_dict`. Print `feature_cols` and add the
missing feature to `feature_dict` with its correct computation before continuing.

**Stop after this step.**

---

## Step 4 — Stage 2 Matching Function

Add this function to `main.py`:

```python
def match_sports_in_group(group: str, height: float, weight: float) -> list:
    sports_in_group = SPORT_GROUPS.get(group, [])
    results = []

    for sport in sports_in_group:
        if sport not in sport_benchmarks:
            continue

        bench = sport_benchmarks[sport]
        avg_h = bench.get("avgHeight")
        avg_w = bench.get("avgWeight")

        if avg_h is None or avg_w is None:
            continue

        height_diff = round(height - avg_h, 1)
        weight_diff = round(weight - avg_w, 1)

        # Normalized distance score (lower = better match)
        h_score = abs(height_diff) / avg_h
        w_score = abs(weight_diff) / avg_w
        distance = (h_score + w_score) / 2

        # Convert to match score (100 = perfect match)
        match_score = round(max(0, 100 - (distance * 200)), 1)

        results.append({
            "sport":        sport,
            "match_score":  match_score,
            "avg_height":   avg_h,
            "avg_weight":   avg_w,
            "height_diff":  height_diff,
            "weight_diff":  weight_diff
        })

    # Sort by match score descending, return top 3
    results.sort(key=lambda x: x["match_score"], reverse=True)
    ranked = []
    for i, r in enumerate(results[:3]):
        r["rank"] = i + 1
        ranked.append(r)

    return ranked
```

Also add the SPORT_GROUPS dict at the top of `main.py` (after imports):

```python
SPORT_GROUPS = {
    "Ball":       ["Basketball", "Football", "Handball", "Volleyball", "Baseball",
                   "Softball", "Ice Hockey", "Hockey", "Water Polo", "Rugby",
                   "Rugby Sevens", "Tennis", "Table Tennis", "Badminton"],
    "Endurance":  ["Athletics", "Cycling", "Rowing", "Cross Country Skiing",
                   "Alpine Skiing", "Ski Jumping", "Nordic Combined", "Biathlon",
                   "Modern Pentathlon", "Triathlon", "Speed Skating",
                   "Short Track Speed Skating", "Luge", "Bobsleigh", "Skeleton"],
    "Water":      ["Diving", "Canoeing", "Sailing", "Swimming"],
    "Combat":     ["Boxing", "Judo", "Wrestling", "Taekwondo", "Fencing"],
    "Precision":  ["Archery", "Shooting", "Golf"],
    "Strength":   ["Weightlifting"],
    "Gymnastics": ["Gymnastics", "Rhythmic Gymnastics", "Trampolining"],
    "Art":        ["Figure Skating", "Synchronized Swimming"],
    "Skill":      ["Equestrianism", "Art Competitions"],
    "Other":      []
}
```

**Stop after this step.**

---

## Step 5 — Update the /predict Endpoint

Replace the existing `/predict` endpoint entirely:

```python
@app.post("/predict")
def predict(input: AthleteInput):
    try:
        # Stage 1 — ML group prediction
        features = build_features(input)
        group_probs  = sport_model.predict_proba(features)[0]
        group_labels = label_encoder.classes_
        predicted_idx   = int(group_probs.argmax())
        predicted_group = group_labels[predicted_idx]

        # Top 3 groups with confidence
        top3_idx = group_probs.argsort()[-3:][::-1]
        top_groups = [
            {
                "group":      group_labels[i],
                "confidence": round(float(group_probs[i]) * 100, 1)
            }
            for i in top3_idx
        ]

        # Stage 2 — Physics-based sport matching within predicted group
        top3_sports = match_sports_in_group(
            predicted_group,
            input.height,
            input.weight
        )

        return {
            "sport_group":      predicted_group,
            "group_confidence": round(float(group_probs[predicted_idx]) * 100, 1),
            "top_groups":       top_groups,
            "top3_sports":      top3_sports
        }

    except KeyError as e:
        raise HTTPException(status_code=422, detail=f"Missing feature: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
```

**Stop after this step.**

---

## Step 6 — Test FastAPI

Start the server:
```bash
uvicorn main:app --reload --port 8000
```

Test:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"height": 185, "weight": 80, "age": 22, "sex": "M", "season": "Summer"}'
```

Expected: a response with `sport_group`, `group_confidence`, `top_groups`,
and `top3_sports` with at least 1-3 sports listed.

If `top3_sports` is empty, it means none of the sports in that group exist in
`sportBenchmarks.json`. Print the group name and cross-check against the
benchmarks file.

**Do not proceed to Part 2 until this returns a valid response.**

---

---

# PART 2 — Next.js Updates

> Location: `/performance-analyzer/`
> Use pnpm. Do not use npm or npx.

---

## Step 1 — Update TypeScript Types

Open `/types/index.ts`. Replace the FastAPI-related types with:

```ts
export interface SportGroupResult {
  group: string;
  confidence: number;
}

export interface SportMatch {
  rank: number;
  sport: string;
  match_score: number;
  avg_height: number;
  avg_weight: number;
  height_diff: number;
  weight_diff: number;
}

export interface PredictionResult {
  sport_group: string;
  group_confidence: number;
  top_groups: SportGroupResult[];
  top3_sports: SportMatch[];
}
```

Do NOT remove or modify any other existing types.

**Stop after this step.**

---

## Step 2 — Update API Route

Open `/app/api/analyze/route.ts`. The proxy logic stays the same — no changes
needed here as long as it forwards the 5 fields and returns whatever FastAPI sends.

Verify the route is passing: `height, weight, age, sex, season` — nothing more,
nothing less.

**Stop after this step.**

---

## Step 3 — Update ResultsPanel

Open `/components/ResultsPanel.tsx`. Rewrite it to display the two-stage result.

Props: `result: PredictionResult`

### Layout (top to bottom):

**1. Sport Group Banner**
Large prominent card at the top:
- Label: "YOUR SPORT CATEGORY" in small uppercase accent text
- Value: `result.sport_group` in large Barlow Condensed uppercase
- Confidence: `result.group_confidence`% shown as a progress bar
- Subtext: "Based on your physical profile"

**2. Top 3 Group Breakdown**
Small row of 3 pills showing `top_groups`:
- Each pill: group name + confidence %
- #1 group highlighted in accent color, #2 and #3 dimmer

**3. Individual Sport Matches**
Heading: "BEST SPORT MATCHES WITHIN [sport_group]"
Map over `result.top3_sports`, for each render a card with:
- Rank badge (#1, #2, #3)
- Sport name in Barlow Condensed uppercase
- Match Score as animated progress bar (0–100%)
- Two stat rows:
  - "Your height: Xcm | Olympic avg: Xcm | Diff: +/-Xcm"
  - "Your weight: Xkg | Olympic avg: Xkg | Diff: +/-Xkg"
- Color the diff green if within ±5, yellow if ±5–15, red if >±15

Keep all existing CSS variables, card styles, and font choices from the
current design. Only update the data being rendered.

**Stop after this step.**

---

## Step 4 — Update Main Page

Open `/app/page.tsx`. Update state type:

```ts
const [result, setResult] = useState<PredictionResult | null>(null);
```

No other changes needed to page.tsx if the existing submit handler already
passes all 5 fields correctly.

**Stop after this step.**

---

## Step 5 — Test End to End

1. Confirm FastAPI is running: `curl http://localhost:8000/health`
2. Run Next.js: `pnpm dev`
3. Submit a test profile
4. Confirm you see:
   - Sport category banner with confidence bar
   - Top 3 group pills
   - 3 individual sport cards with height/weight comparison

**Integration complete.**

---

## Important Notes

- `pnpm` only — never npm or npx
- Feature order in `build_features()` must match `feature_cols.pkl` exactly —
  print it on startup to verify
- If `top3_sports` returns empty for a group, add those sports to
  `sportBenchmarks.json` manually with estimated averages
- The old 4 pkl files (`sport_model.pkl`, `scaler.pkl`, `le_sex.pkl`,
  `le_sport.pkl`) should be deleted from `/fastapi/model/` to avoid confusion
- Do NOT modify `sportBenchmarks.json` structure — only read from it
- Sex must be sent as `"M"` or `"F"` — verify the form still sends these values
