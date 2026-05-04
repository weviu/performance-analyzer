import { NextRequest, NextResponse } from "next/server";

import { logPrediction } from "@/lib/predictionLogger";
import {
  getInputWarnings,
  validatePredictionInput,
} from "@/lib/predictionValidation";
import { FastAPIInput } from "@/types";

export const runtime = "nodejs";

const FASTAPI_PREDICT_URL = "http://localhost:8000/predict";
const FASTAPI_TIMEOUT_MS = 10000;

function extractFastApiErrorMessage(errorText: string): string {
  if (!errorText) {
    return "FastAPI error: empty response body.";
  }

  try {
    const parsed = JSON.parse(errorText) as { detail?: unknown; error?: unknown };

    if (typeof parsed.detail === "string") {
      return `FastAPI error: ${parsed.detail}`;
    }

    if (typeof parsed.error === "string") {
      return `FastAPI error: ${parsed.error}`;
    }
  } catch {
    // Keep fallback raw text message when body is not JSON.
  }

  return `FastAPI error: ${errorText}`;
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const validation = validatePredictionInput(body as Partial<FastAPIInput>);

  if (!validation.isValid) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        errors: validation.errors,
      },
      { status: 400 }
    );
  }

  const validatedInput = body as FastAPIInput;
  const warnings = getInputWarnings(validatedInput);

  const fastApiPayload = {
    height: validatedInput.height,
    weight: validatedInput.weight,
    age: validatedInput.age,
    sex: validatedInput.sex,
    season: validatedInput.season,
  };

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), FASTAPI_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(FASTAPI_PREDICT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fastApiPayload),
      signal: abortController.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          error:
            "Prediction service timed out. Please try again later.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Prediction service is unavailable. Please try again later." },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: extractFastApiErrorMessage(errorText) },
      { status: response.status }
    );
  }

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    return NextResponse.json(
      { error: "Prediction service returned an invalid JSON response." },
      { status: 502 }
    );
  }

  void logPrediction({
    input: validatedInput,
    predictionResponse: data,
    warnings,
  }).catch((error) => {
    console.error("Failed to write prediction log:", error);
  });

  return NextResponse.json(data);
}

