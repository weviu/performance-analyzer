"use client";

import { useState } from "react";
import MetricForm from "@/components/MetricForm";
import ResultsPanel from "@/components/ResultsPanel";
import { PredictionResult } from "@/types";

export default function Home() {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleSubmit(formData: any) {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          height: formData.height,
          weight: formData.weight,
          age: formData.age,
          sex: formData.sex,
          season: formData.season,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Request failed");
      }

      const data: PredictionResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Make sure the prediction service is running.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{
        background:
          "radial-gradient(ellipse at 20% 20%, #0d1f35 0%, var(--bg-primary) 60%)",
      }}
    >
      <div className="mx-auto max-w-[1200px]">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1
            className="text-5xl font-extrabold uppercase tracking-widest md:text-6xl"
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              color: "var(--accent)",
            }}
          >
            Athlete Analyzer
          </h1>
          <p
            className="mt-2 text-base md:text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Discover the sport your body was built for
          </p>
        </header>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left: Form */}
          <div>
            <MetricForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>

          {/* Right: Results */}
          <div>
            {!result && !isLoading && !error && (
              <div
                className="flex h-full min-h-[200px] items-center justify-center rounded-xl border text-center"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                <p style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Your results will appear here
                </p>
              </div>
            )}

            {isLoading && (
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  padding: "2rem 1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1.25rem",
                }}
              >
                <div
                  className="loading-bar"
                  style={{
                    width: "100%",
                    height: "4px",
                    background: "var(--accent)",
                    borderRadius: "999px",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <p
                    style={{
                      fontFamily: "var(--font-barlow-condensed)",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    Analyzing your athletic profile
                  </p>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: "rgba(255,50,50,0.08)",
                  border: "1px solid rgba(255,50,50,0.3)",
                  borderRadius: "0.75rem",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "1.1rem", lineHeight: 1.4, flexShrink: 0 }}>✕</span>
                <p style={{ margin: 0, color: "#ff8080", fontSize: "0.9rem", lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            {result && (
              <div className="results-enter">
                <ResultsPanel result={result} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
