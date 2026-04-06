"use client";

import { useState } from "react";
import { AthleteMetrics } from "@/types";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (formData: any) => void;
  isLoading: boolean;
}

const defaultMetrics: AthleteMetrics & { season: string } = {
  age: 25,
  sex: "M",
  height: 175,
  weight: 75,
  sprintTime: 5.5,
  verticalJump: 50,
  season: "Summer",
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  width: "100%",
  outline: "none",
  fontSize: "0.95rem",
};

const labelTextStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-dm-sans)",
};

function Tooltip() {
  const [visible, setVisible] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "default", flexShrink: 0 }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          border: "1px solid var(--text-secondary)",
          color: "var(--text-secondary)",
          fontSize: "0.6rem",
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        ?
      </span>
      {visible && (
        <span
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1e2d45",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontSize: "0.75rem",
            lineHeight: 1.5,
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            width: "220px",
            zIndex: 50,
            pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        >
          Sprint 5m right, touch the line. Sprint 10m left, touch the line. Sprint 5m back to start. Measures lateral quickness and change-of-direction speed.
          <span
            style={{
              position: "absolute",
              top: "-5px",
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: "8px",
              height: "8px",
              background: "#1e2d45",
              border: "1px solid var(--border)",
              borderBottom: "none",
              borderRight: "none",
            }}
          />
        </span>
      )}
    </span>
  );
}

function Field({
  label,
  unit,
  tooltip,
  children,
}: {
  label: string;
  unit?: string;
  tooltip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ ...labelTextStyle, display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.35rem" }}>
        <span>{label}</span>
        {unit && (
          <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
            ({unit})
          </span>
        )}
        {tooltip && <Tooltip />}
      </div>
      {children}
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
  marginBottom: "1rem",
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-barlow-condensed)",
  fontWeight: 700,
  fontSize: "0.85rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--accent)",
  marginBottom: "1rem",
};

export default function MetricForm({ onSubmit, isLoading }: Props) {
  const [metrics, setMetrics] = useState<AthleteMetrics & { season: string }>(defaultMetrics);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setMetrics((prev) => ({
      ...prev,
      [name]: e.target.type === "number" ? parseFloat(value) : value,
    }));
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "var(--accent)";
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "var(--border)";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(metrics);
  }

  const fieldProps = {
    onFocus: handleFocus,
    onBlur: handleBlur,
    style: inputStyle,
  };

  return (
    <form onSubmit={handleSubmit} method="POST" noValidate style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Basic Info */}
      <div style={sectionStyle}>
        <p style={sectionTitleStyle}>Basic Info</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <Field label="Age" unit="years">
            <input type="number" name="age" value={metrics.age} onChange={handleChange} min={10} max={80} required {...fieldProps} />
          </Field>
          <Field label="Biological Sex">
            <select name="sex" value={metrics.sex} onChange={handleChange} {...fieldProps}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </Field>
          <Field label="Season">
            <select name="season" value={metrics.season} onChange={handleChange} {...fieldProps}>
              <option value="Summer">Summer</option>
              <option value="Winter">Winter</option>
            </select>
          </Field>
          <Field label="Height" unit="cm">
            <input type="number" name="height" value={metrics.height} onChange={handleChange} min={100} max={250} required {...fieldProps} />
          </Field>
          <Field label="Weight" unit="kg">
            <input type="number" name="weight" value={metrics.weight} onChange={handleChange} min={30} max={200} required {...fieldProps} />
          </Field>
        </div>
      </div>

      {/* Power & Speed */}
      <div style={sectionStyle}>
        <p style={sectionTitleStyle}>Power &amp; Speed</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <Field label="30-Meter Sprint" unit="sec">
            <input type="number" name="sprintTime" value={metrics.sprintTime} onChange={handleChange} min={3} max={15} step={0.01} required {...fieldProps} />
          </Field>
          <Field label="Vertical Jump" unit="cm">
            <input type="number" name="verticalJump" value={metrics.verticalJump} onChange={handleChange} min={10} max={120} required {...fieldProps} />
          </Field>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "0.85rem",
          background: isLoading ? "var(--accent-dim)" : "var(--accent)",
          color: "#000",
          fontFamily: "var(--font-barlow-condensed)",
          fontWeight: 700,
          fontSize: "1.1rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          border: "none",
          borderRadius: "0.75rem",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "filter 0.15s ease, transform 0.15s ease",
          marginTop: "0.5rem",
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.filter = "brightness(1.15)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = "brightness(1)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {isLoading ? "Analyzing..." : "Analyze My Profile"}
      </button>
    </form>
  );
}
