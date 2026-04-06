# Next.js → FastAPI Integration Prompt

## Context

We have two running services:
1. **Next.js app** — athlete performance analyzer UI, currently calls Groq API for predictions
2. **FastAPI service** — ML model running on `http://localhost:8000`, exposes `POST /predict`

We need to replace the Groq API call with a call to FastAPI, and update the
form to include a Season field the ML model requires.

---

## What FastAPI expects (POST /predict)

```json
{
  "height": 185,
  "weight": 80,
  "age": 22,
  "sex": "M",
  "season": "Summer"
}
```

## What FastAPI returns

```json
{
  "predicted_sport": "Football",
  "top3": [
    { "sport": "Football", "confidence": 38.1 },
    { "sport": "Swimming", "confidence": 17.3 },
    { "sport": "Cycling", "confidence": 10.7 }
  ]
}
```

## Sports the model knows

`Alpine Skiing, Athletics, Cross Country Skiing, Cycling, Gymnastics, Rowing, Shooting, Swimming, Wrestling`

---

## Step 1 — Update TypeScript Types

Open `/types/index.ts` and add/update the following types alongside existing ones:

```ts
export interface FastAPIInput {
  height: number;
  weight: number;
  age: number;
  sex: string;       // "M" or "F"
  season: string;    // "Summer" or "Winter"
}

export interface SportPrediction {
  sport: string;
  confidence: number;
}

export interface FastAPIResult {
  predicted_sport: string;
  top3: SportPrediction[];
}
```

Do NOT remove or modify existing types — just add these new ones.

**Stop after this step.**

---

## Step 2 — Update the API Route

Open `/app/api/analyze/route.ts` and replace the entire file with the following:

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const fastApiPayload = {
    height: body.height,
    weight: body.weight,
    age: body.age,
    sex: body.sex,           // "M" or "F"
    season: body.season      // "Summer" or "Winter"
  };

  try {
    const response = await fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fastApiPayload)
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `FastAPI error: ${error}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (err) {
    return NextResponse.json(
      { error: "Could not reach prediction service. Is FastAPI running on port 8000?" },
      { status: 503 }
    );
  }
}
```

**Stop after this step.**

---

## Step 3 — Add Season Field to the Form

Open `/components/MetricForm.tsx`.

1. Add `season` to the form state, defaulting to `"Summer"`:
```ts
const [formData, setFormData] = useState({
  // ... existing fields ...
  season: "Summer"
});
```

2. Add a Season dropdown to the **Basic Info** section, after the Sex dropdown:
```tsx
<div className="input-wrapper">
  <label>Season</label>
  <select
    value={formData.season}
    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
  >
    <option value="Summer">Summer</option>
    <option value="Winter">Winter</option>
  </select>
</div>
```

3. Make sure `season` is included when `onSubmit` is called with the form data.

**Stop after this step.**

---

## Step 4 — Update the Results Panel

Open `/components/ResultsPanel.tsx`.

The FastAPI response is simpler than the old Groq response — no `summary`,
no `strengths`, no `considerations`. Update the component to display:

1. **Predicted sport** — large, prominent, the `predicted_sport` field
2. **Top 3 list** — map over `top3` array, for each show:
   - Sport name
   - Confidence as a progress bar (0–100%)
   - Confidence percentage number

Keep all existing styling — just update the data being rendered.

If the existing `ResultsPanel` expects the old `AnalysisResult` type, update
the props type to accept `FastAPIResult` instead.

**Stop after this step.**

---

## Step 5 — Update Main Page

Open `/app/page.tsx`.

1. Update the state type from `AnalysisResult | null` to `FastAPIResult | null`
2. Update the submit handler to send only the 5 fields FastAPI needs:
```ts
const handleSubmit = async (formData: any) => {
  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        height: formData.height,
        weight: formData.weight,
        age: formData.age,
        sex: formData.sex,
        season: formData.season
      })
    });

    if (!response.ok) throw new Error("Prediction failed");

    const data = await response.json();
    setResult(data);
  } catch (err) {
    setError("Something went wrong. Make sure the prediction service is running.");
  } finally {
    setIsLoading(false);
  }
};
```

**Stop after this step.**

---

## Step 6 — Test End to End

1. Make sure FastAPI is running: `http://localhost:8000/health` should return `{"status":"ok"}`
2. Run Next.js: `pnpm dev`
3. Open the app, fill in the form, submit
4. Confirm you see the predicted sport and top 3 results rendered correctly

**Integration complete.**

---

## Important Notes

- Use `pnpm` — not `npm` or `npx`
- Do NOT remove existing form fields (sprint time, vertical jump, etc.) —
  just add Season. The other fields can stay in the UI even if FastAPI
  doesn't use them for now
- The sex value must be sent as `"M"` or `"F"` — update the Sex dropdown
  options if they currently say "Male"/"Female"
- FastAPI must be running on port 8000 for this to work locally
- Do not modify the FastAPI service at all — only touch Next.js files
