"use client";

const steps = [
  {
    number: "01",
    title: "Input JSON Schema",
    description:
      "Paste or write your JSON schema definition. Describe the shape of the API response you expect.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    color: "#0071e3",
    bg: "rgba(0,113,227,0.08)",
  },
  {
    number: "02",
    title: "Generate Mock API",
    description:
      "ApiMate instantly spins up a live endpoint that returns realistic, schema-valid data on every request.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    color: "#5e5ce6",
    bg: "rgba(94,92,230,0.08)",
  },
  {
    number: "03",
    title: "Build Seamlessly",
    description:
      "Use your mock endpoint like a real API. Build, test, iterate — then swap the URL when the backend is ready.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    color: "#30d158",
    bg: "rgba(48,209,88,0.08)",
  },
];

function Arrow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        color: "var(--text-tertiary)",
        flexShrink: 0,
        paddingTop: 16,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M6 16h20M20 10l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{
        padding: "100px 0",
        background: "var(--bg-base)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle grid pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          pointerEvents: "none",
          opacity: 0.6,
        }}
      />

      <div className="container-default" style={{ position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--accent-light)",
              border: "1px solid rgba(0,113,227,0.15)",
              borderRadius: 50,
              padding: "5px 14px",
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: "0.82rem", color: "var(--accent)", fontWeight: 500 }}>
              Simple as 1-2-3
            </span>
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", marginBottom: 16 }}>
            How It Works
          </h2>
          <p style={{ fontSize: "1.05rem", maxWidth: 480, margin: "0 auto", color: "var(--text-secondary)" }}>
            From JSON schema to live API endpoint in seconds. No signup friction, no infra to manage.
          </p>
        </div>

        {/* Steps horizontal flow */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {steps.map((step, i) => (
            <div key={step.number} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div
                className="animate-fade-up"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  opacity: 0,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 20,
                  padding: "32px 28px",
                  maxWidth: 280,
                  boxShadow: "var(--shadow-md)",
                  transition: "all 0.3s cubic-bezier(0.34, 1.2, 0.64, 1)",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-xl)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
                }}
              >
                {/* Step number */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: step.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: step.color,
                    }}
                  >
                    {step.icon}
                  </div>
                  <span
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: "rgba(0,0,0,0.06)",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {step.number}
                  </span>
                </div>

                <h3 style={{ fontSize: "1.05rem", fontWeight: 650, marginBottom: 10, color: "var(--text-primary)" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                  {step.description}
                </p>
              </div>

              {/* Arrow between steps */}
              {i < steps.length - 1 && <Arrow />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
