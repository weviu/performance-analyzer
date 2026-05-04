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
