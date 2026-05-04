from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import json
import numpy as np
import pandas as pd
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Sport group → individual sports mapping (Stage 2)
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Load models once at startup — NOT on every request
# ---------------------------------------------------------------------------
MODEL_DIR = Path("model")

try:
    sport_model   = joblib.load(MODEL_DIR / "sport_model-4.pkl")
    label_encoder = joblib.load(MODEL_DIR / "label_encoder.pkl")
    feature_cols  = joblib.load(MODEL_DIR / "feature_cols.pkl")
except FileNotFoundError as e:
    raise RuntimeError(
        f"Model file not found: {e}. "
        "Ensure sport_model-4.pkl, label_encoder.pkl, and feature_cols.pkl are present in model/."
    )

# Load sport benchmarks for Stage 2
_benchmarks_path = Path("../lib/sportBenchmarks.json")
if not _benchmarks_path.exists():
    _benchmarks_path = Path(__file__).parent.parent / "lib" / "sportBenchmarks.json"
with open(_benchmarks_path, "r") as f:
    sport_benchmarks = json.load(f)

print("Feature columns:", feature_cols)
print("Label classes:", label_encoder.classes_)
print("Models loaded successfully.")

# ---------------------------------------------------------------------------
# App & CORS
# ---------------------------------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------
class AthleteInput(BaseModel):
    height: float = Field(..., ge=100, le=250, description="Height in cm")
    weight: float = Field(..., ge=30,  le=200, description="Weight in kg")
    age:    float = Field(..., ge=10,  le=80,  description="Age in years")
    sex:    str   = Field(..., pattern="^(M|F)$", description="M or F")
    season: str   = Field(..., pattern="^(Summer|Winter)$")


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------
def build_features(input: AthleteInput) -> np.ndarray:
    sex_enc    = 1 if input.sex == "M" else 0
    season_enc = 1 if input.season == "Summer" else 0
    bmi        = input.weight / ((input.height / 100) ** 2)
    age_group  = float(pd.cut([input.age],    bins=[0, 20, 25, 30, 35, 50],       labels=False)[0])
    weight_cat = float(pd.cut([input.weight], bins=[0, 60, 70, 80, 90, 100, 200], labels=False)[0])
    height_sq  = input.height ** 2
    hw_ratio   = input.height / input.weight
    power_index      = (input.weight * input.height) / 1000
    bmi_x_age        = bmi * input.age
    weight_to_height = input.weight / input.height

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

    values = [feature_dict[col] for col in feature_cols]
    return np.array([values])


# ---------------------------------------------------------------------------
# Stage 2 — physics-based sport matching within a group
# ---------------------------------------------------------------------------
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

        h_score = abs(height_diff) / avg_h
        w_score = abs(weight_diff) / avg_w
        distance = (h_score + w_score) / 2

        match_score = round(max(0, 100 - (distance * 200)), 1)

        results.append({
            "sport":       sport,
            "match_score": match_score,
            "avg_height":  avg_h,
            "avg_weight":  avg_w,
            "height_diff": height_diff,
            "weight_diff": weight_diff,
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    ranked = []
    for i, r in enumerate(results[:3]):
        r["rank"] = i + 1
        ranked.append(r)

    return ranked


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(input: AthleteInput):
    try:
        # Stage 1 — ML group prediction
        features    = build_features(input)
        group_probs  = sport_model.predict_proba(features)[0]
        group_labels = label_encoder.classes_
        predicted_idx   = int(group_probs.argmax())
        predicted_group = group_labels[predicted_idx]

        top3_idx = group_probs.argsort()[-3:][::-1]
        top_groups = [
            {
                "group":      group_labels[i],
                "confidence": round(float(group_probs[i]) * 100, 1),
            }
            for i in top3_idx
        ]

        # Stage 2 — physics-based sport matching within predicted group
        top3_sports = match_sports_in_group(predicted_group, input.height, input.weight)

        return {
            "sport_group":      predicted_group,
            "group_confidence": round(float(group_probs[predicted_idx]) * 100, 1),
            "top_groups":       top_groups,
            "top3_sports":      top3_sports,
        }

    except KeyError as e:
        raise HTTPException(status_code=422, detail=f"Missing feature: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
