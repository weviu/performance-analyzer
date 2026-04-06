import { AthleteMetrics } from "@/types";
import benchmarks from "./sportBenchmarks.json";

type BenchmarkData = Record<string, { avgHeight: number; avgWeight: number; sampleSize: number }>;
const data = benchmarks as BenchmarkData;

// Map app sport names → Olympic dataset sport names
const sportMap: Record<string, string> = {
  "Basketball": "Basketball",
  "Soccer": "Football",
  "Baseball": "Baseball",
  "Tennis": "Tennis",
  "Swimming": "Swimming",
  "Volleyball": "Volleyball",
  "Track & Field (Sprints)": "Athletics",
  "Track & Field (Distance)": "Athletics",
  "Wrestling": "Wrestling",
  "Gymnastics": "Gymnastics",
  "Rowing": "Rowing",
  "Cycling": "Cycling",
};

function buildBenchmarksSection(): string {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const [appSport, datasetSport] of Object.entries(sportMap)) {
    if (seen.has(appSport)) continue;
    seen.add(appSport);
    const b = data[datasetSport];
    if (!b) continue;
    lines.push(`- ${appSport}: avg height ${b.avgHeight}cm, avg weight ${b.avgWeight}kg (n=${b.sampleSize.toLocaleString()})`);
  }
  return lines.join("\n");
}

export function buildPrompt(metrics: AthleteMetrics): string {
  return `You are a professional sports science analyst. Your job is to analyze an athlete's physical performance metrics and recommend the 3 most suitable sports for them.

The athlete has NO prior sport background. Base your analysis purely on their physical attributes and performance data.

## Athlete Metrics
- Age: ${metrics.age} years
- Biological Sex: ${metrics.sex}
- Height: ${metrics.height} cm
- Weight: ${metrics.weight} kg
- 30-Meter Sprint Time: ${metrics.sprintTime} seconds
- Vertical Jump Height: ${metrics.verticalJump} cm

## Olympic Athlete Benchmarks (average height & weight per sport)
Use these to contextualize the athlete's physical profile against real Olympic-level competitors.

${buildBenchmarksSection()}

## Sports to Consider
Evaluate fit across these sports only:
Basketball, Football (American), Soccer, Baseball, Tennis, Swimming, Volleyball, Track & Field (Sprints), Track & Field (Distance), Wrestling, Martial Arts / MMA, Gymnastics, Rowing, Cycling

## Instructions
Return ONLY a raw JSON object. No markdown, no backticks, no explanation outside the JSON. Where relevant, reference how the athlete's height and weight compares to the Olympic benchmark for that sport.

When determining standoutMetric, only highlight a metric if it genuinely clears the "good" threshold for an athletic population:
- Vertical jump: below 60cm is average, 60–75cm is good, 75cm+ is impressive
- 30-meter sprint: below 4.5s is good, below 4.2s is impressive
- If no metric clears its "good" threshold, set standoutMetric to exactly: "No standout metrics."
Do not inflate or over-praise average values. Structure:

{
  "summary": "2-3 sentence overall athletic profile summary",
  "recommendations": [
    {
      "rank": 1,
      "sport": "Sport Name",
      "fitScore": 92,
      "strengths": ["reason 1", "reason 2"],
      "considerations": "One sentence about what the athlete would need to develop",
      "position": "Suggested position or role within the sport (if applicable)"
    },
    { "rank": 2, "sport": "...", "fitScore": 0, "strengths": [], "considerations": "", "position": "" },
    { "rank": 3, "sport": "...", "fitScore": 0, "strengths": [], "considerations": "", "position": "" }
  ],
  "standoutMetric": "The single most impressive metric and why it matters"
}

fitScore is an integer from 0 to 100.`;
}

