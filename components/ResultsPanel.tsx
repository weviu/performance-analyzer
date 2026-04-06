"use client";

import { FastAPIResult } from "@/types";

interface Props {
  result: FastAPIResult;
}

const rankColors = ["var(--accent)", "#7a8ba8", "#a07850"];
const rankBg = ["rgba(0,240,160,0.1)", "rgba(122,139,168,0.1)", "rgba(160,120,80,0.1)"];

export default function ResultsPanel({ result }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Predicted Sport card */}
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
            marginBottom: "0.5rem",
          }}
        >
          Predicted Sport
        </p>
        <p
          style={{
            fontFamily: "var(--font-barlow-condensed)",
            fontWeight: 800,
            fontSize: "2rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--accent)",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {result.predicted_sport}
        </p>
      </div>

      {/* Top 3 */}
      {result.top3.map((item, i) => (
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
              #{i + 1}
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
          <div>
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
                {item.confidence}%
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
                  width: `${item.confidence}%`,
                  height: "100%",
                  background: rankColors[i],
                  borderRadius: "999px",
                  transition: "width 0.8s ease",
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
