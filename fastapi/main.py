from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Load models once at startup — NOT on every request
# ---------------------------------------------------------------------------
MODEL_DIR = "model"

try:
    sport_model = joblib.load(os.path.join(MODEL_DIR, "sport_model.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
    le_sex = joblib.load(os.path.join(MODEL_DIR, "le_sex.pkl"))
    le_sport = joblib.load(os.path.join(MODEL_DIR, "le_sport.pkl"))
except FileNotFoundError as e:
    raise RuntimeError(
        f"Model file not found: {e}. "
        "Ensure all .pkl files are present in the model/ directory."
    )

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
VALID_SEX_VALUES = {"M", "F"}
VALID_SEASON_VALUES = {"Summer", "Winter"}


class AthleteInput(BaseModel):
    height: float   # cm
    weight: float   # kg
    age: float      # years
    sex: str        # "M" or "F"
    season: str     # "Summer" or "Winter"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(input: AthleteInput):
    try:
        # Validate categorical fields before encoding
        if input.sex not in VALID_SEX_VALUES:
            raise ValueError(
                f"Invalid sex value '{input.sex}'. Must be one of: {VALID_SEX_VALUES}"
            )
        if input.season not in VALID_SEASON_VALUES:
            raise ValueError(
                f"Invalid season value '{input.season}'. Must be one of: {VALID_SEASON_VALUES}"
            )

        # Encode sex
        sex_enc = le_sex.transform([input.sex])[0]

        # Compute all derived features (must match training feature_cols exactly)
        bmi = input.weight / ((input.height / 100) ** 2)
        season_enc = 1 if input.season == "Summer" else 0

        # Age_group: pd.cut(Age, bins=[0,20,25,30,35,50], labels=False)
        age_bins = np.array([0, 20, 25, 30, 35, 50])
        age_group = int(np.clip(np.searchsorted(age_bins[1:], input.age, side="left"), 0, len(age_bins) - 2))

        height_sq = input.height ** 2

        # Weight_cat: pd.cut(Weight, bins=[0,60,70,80,90,100,200], labels=False)
        weight_bins = np.array([0, 60, 70, 80, 90, 100, 200])
        weight_cat = int(np.clip(np.searchsorted(weight_bins[1:], input.weight, side="left"), 0, len(weight_bins) - 2))

        hw_ratio = input.height / input.weight

        # Feature order must match training exactly:
        # ['Height', 'Weight', 'Age', 'Sex_enc', 'BMI', 'Season_enc', 'Age_group', 'Height_sq', 'Weight_cat', 'HW_ratio']
        feature_cols = ['Height', 'Weight', 'Age', 'Sex_enc', 'BMI',
                        'Season_enc', 'Age_group', 'Height_sq', 'Weight_cat', 'HW_ratio']
        features = pd.DataFrame(
            [[input.height, input.weight, input.age, sex_enc, bmi,
              season_enc, age_group, height_sq, weight_cat, hw_ratio]],
            columns=feature_cols,
        )

        # Scale and predict
        features_scaled = scaler.transform(features)
        prediction_enc = sport_model.predict(features_scaled)[0]
        sport_name = le_sport.inverse_transform([prediction_enc])[0]

        # Top-3 match scores (temperature-sharpened probabilities, T=0.4)
        # Sharpening peaks the distribution so scores feel meaningful in the UI.
        # Ranking is preserved — #1 stays #1. Label as "Match Score", not "Confidence".
        try:
            probas = sport_model.predict_proba(features_scaled)[0]
            classes = le_sport.inverse_transform(range(len(probas)))
            T = 0.7
            sharpened = probas ** (1 / T)
            sharpened = sharpened / sharpened.sum()
            top3_indices = sharpened.argsort()[-3:][::-1]
            top3 = [
                {"sport": classes[i], "confidence": round(float(sharpened[i]) * 100, 1)}
                for i in top3_indices
            ]
        except AttributeError:
            top3 = [{"sport": sport_name, "confidence": None}]

        return {"predicted_sport": sport_name, "top3": top3}

    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Invalid input: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
