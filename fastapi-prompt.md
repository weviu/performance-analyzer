# FastAPI Sport Prediction Service — Build Prompt

## Context

We have a trained machine learning model that predicts the most suitable sport
for an athlete based on physical attributes. We need to wrap it in a FastAPI
service so a Next.js frontend can call it via HTTP.

The model was trained in a Jupyter notebook using scikit-learn. We have the
following pkl files (place them in the `/model` directory of this project):

- `sport_model.pkl` — the trained classifier
- `scaler.pkl` — StandardScaler used to normalize features before prediction
- `le_sex.pkl` — LabelEncoder for Sex (M/F → encoded number)
- `le_sport.pkl` — LabelEncoder for Sport (encoded number → sport name string)

---

## Tech Stack

- Python 3.10+
- FastAPI
- uvicorn (ASGI server)
- scikit-learn
- joblib
- pydantic

---

## File Structure to Generate

```
/
├── main.py                  ← FastAPI app entry point
├── model/
│   ├── sport_model.pkl      ← place here (not generated, provided externally)
│   ├── scaler.pkl           ← place here (not generated, provided externally)
│   ├── le_sex.pkl           ← place here (not generated, provided externally)
│   └── le_sport.pkl         ← place here (not generated, provided externally)
├── requirements.txt
└── .env
```

---

## Step 1 — Project Setup

1. Create the project directory structure above
2. Create `requirements.txt`:
```
fastapi
uvicorn
scikit-learn
joblib
pydantic
python-dotenv
```
3. Create `.env`:
```
ALLOWED_ORIGIN=http://localhost:3000
```
4. Install dependencies:
```bash
pip install -r requirements.txt
```

**Stop after this step.**

---

## Step 2 — Create main.py

Create `main.py` with the following structure and logic:

### Imports and startup

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os
from dotenv import load_dotenv

load_dotenv()
```

### Load models on startup — NOT on every request

```python
MODEL_DIR = "model"

sport_model = joblib.load(os.path.join(MODEL_DIR, "sport_model.pkl"))
scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
le_sex = joblib.load(os.path.join(MODEL_DIR, "le_sex.pkl"))
le_sport = joblib.load(os.path.join(MODEL_DIR, "le_sport.pkl"))
```

### CORS middleware

Allow requests from the Next.js frontend:

```python
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Request model

```python
class AthleteInput(BaseModel):
    height: float      # cm
    weight: float      # kg
    age: float         # years
    sex: str           # "M" or "F"
    season: str        # "Summer" or "Winter"
```

### Feature engineering

Inside the predict endpoint, compute derived features exactly as the
notebook did during training:

```python
# Encode sex
sex_enc = le_sex.transform([input.sex])[0]

# Compute BMI
bmi = input.weight / ((input.height / 100) ** 2)

# Encode season
season_enc = 1 if input.season == "Summer" else 0

# Assemble feature array — order must match training feature_cols exactly:
# ['Height', 'Weight', 'Age', 'Sex_enc', 'BMI', 'Season_enc']
features = np.array([[input.height, input.weight, input.age, sex_enc, bmi, season_enc]])
```

### Scale and predict

```python
features_scaled = scaler.transform(features)
prediction_enc = sport_model.predict(features_scaled)[0]
sport_name = le_sport.inverse_transform([prediction_enc])[0]
```

### Response

Return the predicted sport plus the top 3 probabilities if the model
supports `predict_proba`:

```python
try:
    probas = sport_model.predict_proba(features_scaled)[0]
    classes = le_sport.inverse_transform(range(len(probas)))
    top3_indices = probas.argsort()[-3:][::-1]
    top3 = [
        {"sport": classes[i], "confidence": round(float(probas[i]) * 100, 1)}
        for i in top3_indices
    ]
except:
    top3 = [{"sport": sport_name, "confidence": None}]

return {
    "predicted_sport": sport_name,
    "top3": top3
}
```

### Health check endpoint

```python
@app.get("/health")
def health():
    return {"status": "ok"}
```

**Stop after this step.**

---

## Step 3 — Error Handling

Wrap the entire prediction logic in a try/except:

```python
@app.post("/predict")
def predict(input: AthleteInput):
    try:
        # ... all prediction logic here
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Invalid input: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
```

Common failure points to handle:
- `sex` value not in `le_sex` classes (e.g. user sends "Male" instead of "M")
- `season` value not "Summer" or "Winter"
- pkl files not found on startup (fail loud with a clear error message)

**Stop after this step.**

---

## Step 4 — Run and Test

Start the server:
```bash
uvicorn main:app --reload --port 8000
```

Test the health check:
```bash
curl http://localhost:8000/health
```

Test a prediction:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "height": 185,
    "weight": 80,
    "age": 22,
    "sex": "M",
    "season": "Summer"
  }'
```

Expected response format:
```json
{
  "predicted_sport": "Athletics",
  "top3": [
    { "sport": "Athletics", "confidence": 42.3 },
    { "sport": "Swimming", "confidence": 28.1 },
    { "sport": "Rowing", "confidence": 15.6 }
  ]
}
```

**Stop after this step. Do not touch the Next.js project until this endpoint
is returning valid responses locally.**

---

## Important Notes

- Models are loaded ONCE at startup, not per request — this is critical for performance
- Feature order in the numpy array must exactly match training order:
  `['Height', 'Weight', 'Age', 'Sex_enc', 'BMI', 'Season_enc']`
- Sex input must be `"M"` or `"F"` — exactly as it appeared in the original dataset
- Season input must be `"Summer"` or `"Winter"` — exactly as it appeared in the dataset
- BMI is computed server-side — do NOT ask the user for it in the frontend form
- GradientBoostingClassifier supports `predict_proba` so top3 confidence scores will work
- Do NOT use `npm`, `pnpm`, or any Node.js tooling — this is a pure Python project
