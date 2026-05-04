import { appendFile, mkdir } from "fs/promises";
import path from "path";

import { FastAPIInput } from "@/types";

const LOGS_DIRECTORY = path.join(process.cwd(), "logs");
const PREDICTIONS_LOG_FILE = path.join(LOGS_DIRECTORY, "predictions.log");

interface SportWithConfidence {
  sport: string;
  confidence: number;
}

export interface PredictionLogPayload {
  input: FastAPIInput;
  predictionResponse: unknown;
  warnings?: string[];
}

function extractTop3SportsWithConfidences(
  predictionResponse: unknown
): SportWithConfidence[] {
  if (!predictionResponse || typeof predictionResponse !== "object") {
    return [];
  }

  const data = predictionResponse as {
    top3?: unknown;
    top3_sports?: unknown;
  };

  const candidates = Array.isArray(data.top3)
    ? data.top3
    : Array.isArray(data.top3_sports)
      ? data.top3_sports
      : [];

  return candidates
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as {
        sport?: unknown;
        confidence?: unknown;
        match_score?: unknown;
      };

      const sport = typeof candidate.sport === "string" ? candidate.sport : null;
      const confidenceValue =
        typeof candidate.confidence === "number"
          ? candidate.confidence
          : typeof candidate.match_score === "number"
            ? candidate.match_score
            : null;

      if (!sport || confidenceValue === null) {
        return null;
      }

      return {
        sport,
        confidence: confidenceValue,
      };
    })
    .filter((item): item is SportWithConfidence => item !== null);
}

function extractPredictedSport(predictionResponse: unknown): string | null {
  if (!predictionResponse || typeof predictionResponse !== "object") {
    return null;
  }

  const data = predictionResponse as {
    sport_group?: unknown;
  };

  return typeof data.sport_group === "string" ? data.sport_group : null;
}

export async function logPrediction({
  input,
  predictionResponse,
  warnings = [],
}: PredictionLogPayload): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    input,
    predicted_sport: extractPredictedSport(predictionResponse),
    top3_sports_with_confidences:
      extractTop3SportsWithConfidences(predictionResponse),
    warnings,
  };

  await mkdir(LOGS_DIRECTORY, { recursive: true });
  await appendFile(PREDICTIONS_LOG_FILE, `${JSON.stringify(logEntry)}\n`, "utf8");
}
