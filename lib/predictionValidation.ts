import { FastAPIInput } from "@/types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateNumericField(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): string | null {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return `${fieldName} must be a valid number.`;
  }

  if (value < min || value > max) {
    return `${fieldName} must be between ${min} and ${max}.`;
  }

  return null;
}

export function validatePredictionInput(
  input: Partial<FastAPIInput> | null | undefined
): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return {
      isValid: false,
      errors: ["Request body must be a JSON object."],
    };
  }

  const heightError = validateNumericField(input.height, "height", 100, 250);
  const weightError = validateNumericField(input.weight, "weight", 30, 200);
  const ageError = validateNumericField(input.age, "age", 10, 80);

  if (heightError) errors.push(heightError);
  if (weightError) errors.push(weightError);
  if (ageError) errors.push(ageError);

  if (input.sex !== "M" && input.sex !== "F") {
    errors.push('sex must be exactly "M" or "F".');
  }

  if (input.season !== "Summer" && input.season !== "Winter") {
    errors.push('season must be exactly "Summer" or "Winter".');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getInputWarnings(input: FastAPIInput): string[] {
  const warnings: string[] = [];

  const bmi = input.weight / (input.height / 100) ** 2;

  if (bmi < 15) {
    warnings.push("Very low BMI - predictions may be less reliable");
  }

  if (bmi > 40) {
    warnings.push("Very high BMI - predictions may be less reliable");
  }

  if (input.height > 200 && input.weight < 70) {
    warnings.push("Unusual height/weight ratio - check your measurements");
  }

  return warnings;
}
