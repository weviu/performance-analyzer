"use client";

import { PredictionResult } from "@/types";

interface Props {
  result: PredictionResult;
}

const rankColors = ["var(--accent)", "#7a8ba8", "#a07850"];
const rankBg = ["rgba(74,158,255,0.1)", "rgba(122,139,168,0.1)", "rgba(160,120,80,0.1)"];

function diffColor(diff: number): string {
  const abs = Math.abs(diff);
  if (abs <= 5) return "#4a9eff";
  if (abs <= 15) return "#f0c040";
  return "#f05050";
}

export default function ResultsPanel({ result }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Sport Group Banner */}
      <div
        style={{
          background: "var(--bg-card)",
          borderLeft: "4px solid var(--accent)",
          borderRadius: "0.75rem",
          padding: "1.25rem 1.5rem",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-barlow-condensed)",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            marginBottom: "0.4rem",
          }}
        >
          Your Sport Category
        </p>
        <p
          style={{
            fontFamily: "var(--font-barlow-condensed)",
            fontWeight: 800,
            fontSize: "2.2rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--accent)",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {result.sport_group}
        </p>

        {/* Confidence bar */}
        <div style={{ marginTop: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
            <span
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
              }}
            >
              Confidence
            </span>
            <span
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "var(--accent)",
              }}
            >
              {result.group_confidence}%
            </span>
          </div>
          <div
            style={{
              background: "var(--bg-secondary)",
              borderRadius: "999px",
              height: "6px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${result.group_confidence}%`,
                height: "100%",
                background: "var(--accent)",
                borderRadius: "999px",
                transition: "width 0.8s ease",
              }}
            />
          </div>
        </div>

        <p
          style={{
            fontFamily: "var(--font-barlow-condensed)",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            marginTop: "0.5rem",
            marginBottom: 0,
          }}
        >
          Based on your physical profile
        </p>
      </div>

      {/* Top 3 Group Breakdown */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {result.top_groups.map((g, i) => (
          <span
            key={g.group}
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              fontWeight: 700,
              fontSize: "0.8rem",
              letterSpacing: "0.05em",
              background: i === 0 ? "rgba(74,158,255,0.15)" : "rgba(255,255,255,0.05)",
              color: i === 0 ? "var(--accent)" : "var(--text-secondary)",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              border: `1px solid ${i === 0 ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            {g.group} {g.confidence}%
          </span>
        ))}
      </div>

      {/* Individual Sport Matches */}
      <p
        style={{
          fontFamily: "var(--font-barlow-condensed)",
          fontWeight: 700,
          fontSize: "0.75rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          margin: "0.25rem 0 0",
        }}
      >
        Best Sport Matches Within {result.sport_group}
      </p>

      {result.top3_sports.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-barlow-condensed)" }}>
          No benchmark data available for this sport group.
        </p>
      )}

      {result.top3_sports.map((item, i) => (
        <div
          key={item.sport}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "1.25rem 1.5rem",
            transition: "border-color 0.2s ease, transform 0.2s ease",
            cursor: "default",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = rankColors[i] ?? "var(--accent)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {/* Rank badge + sport name */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <span
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                fontWeight: 800,
                fontSize: "0.8rem",
                letterSpacing: "0.05em",
                background: rankBg[i],
                color: rankColors[i],
                padding: "0.2rem 0.6rem",
                borderRadius: "999px",
                border: `1px solid ${rankColors[i]}`,
              }}
            >
              #{item.rank}
            </span>
            <h3
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                fontWeight: 700,
                fontSize: "1.5rem",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {item.sport}
            </h3>
          </div>

          {/* Match Score bar */}
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <span
                style={{
                  fontFamily: "var(--font-barlow-condensed)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-secondary)",
                }}
              >
                Match Score
              </span>
              <span
                style={{
                  fontFamily: "var(--font-barlow-condensed)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: rankColors[i],
                }}
              >
                {item.match_score}%
              </span>
            </div>
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: "999px",
                height: "6px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${item.match_score}%`,
                  height: "100%",
                  background: rankColors[i],
                  borderRadius: "999px",
                  transition: "width 0.8s ease",
                }}
              />
            </div>
          </div>

          {/* Height stat row */}
          <div
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              marginBottom: "0.3rem",
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span>Height: Olympic avg {item.avg_height}cm</span>
            <span
              style={{
                color: diffColor(item.height_diff),
                fontWeight: 700,
              }}
            >
              Diff: {item.height_diff > 0 ? "+" : ""}{item.height_diff}cm
            </span>
          </div>

          {/* Weight stat row */}
          <div
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span>Weight: Olympic avg {item.avg_weight}kg</span>
            <span
              style={{
                color: diffColor(item.weight_diff),
                fontWeight: 700,
              }}
            >
              Diff: {item.weight_diff > 0 ? "+" : ""}{item.weight_diff}kg
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
