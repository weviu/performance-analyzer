export interface AthleteMetrics {
  age: number;
  sex: string;
  height: number;
  weight: number;
  sprintTime: number;
  verticalJump: number;
}

export interface SportRecommendation {
  rank: number;
  sport: string;
  fitScore: number;
  strengths: string[];
  considerations: string;
  position: string;
}

export interface AnalysisResult {
  summary: string;
  recommendations: SportRecommendation[];
  standoutMetric: string;
}

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
