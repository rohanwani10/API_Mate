"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";

const CODE_SNIPPET = `{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "email": { "type": "string",
               "format": "email" },
    "role": { "enum": ["admin",
                        "user"] }
  }
}`;

const RESPONSE_SNIPPET = `// Generated endpoint ready ✓
GET /api/mock/users

[
  {
    "id": 1847,
    "name": "Jordan Lee",
    "email": "j.lee@acme.io",
    "role": "admin"
  },
  {
    "id": 2031,
    "name": "Sam Rivera",
    "email": "s.rivera@acme.io",
    "role": "user"
  }
]`;

export default function HeroSection() {
  return (
    <section
      id="home"
      style={{
        minHeight: "calc(100vh - 65px)",
        display: "flex",
        alignItems: "center",
        padding: "80px 0 100px",
        position: "relative",
        overflow: "hidden",
      }}
      className="gradient-bg-hero"
    >
      {/* Decorative orbs */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,113,227,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          right: "0%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52,170,220,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="container-default" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        {/* Left: Text & CTAs */}
        <div>
          <div
            className="animate-fade-up"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--accent-light)",
              border: "1px solid rgba(0,113,227,0.15)",
              borderRadius: 50,
              padding: "5px 14px 5px 8px",
              marginBottom: 28,
            }}
          >
            <span style={{ fontSize: 10, background: "var(--accent)", color: "#fff", borderRadius: 50, padding: "2px 8px", fontWeight: 600 }}>
              NEW
            </span>
            <span style={{ fontSize: "0.82rem", color: "var(--accent)", fontWeight: 500 }}>
              JSON→API in under 3 seconds
            </span>
          </div>

          <h1
            className="animate-fade-up animate-delay-1"
            style={{ fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)", fontWeight: 700, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.03em" }}
          >
            Build Frontends{" "}
            <br />
            <span className="gradient-text">Before Backends</span>
            <br />
            Exist
          </h1>

          <p
            className="animate-fade-up animate-delay-2"
            style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: 36, maxWidth: 480, lineHeight: 1.7 }}
          >
            Generate dynamic mock API endpoints instantly from JSON schemas.
            Keep building your frontend while the backend catches up — then swap
            endpoints seamlessly.
          </p>

          <div className="animate-fade-up animate-delay-3" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="button-primary" style={{ fontSize: "1rem", padding: "12px 26px" }}>
                  Get Started Free
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="button-primary"
                style={{ fontSize: "1rem", padding: "12px 26px", textDecoration: "none" }}
              >
                Open Dashboard
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </SignedIn>
            <button
              className="button-secondary"
              style={{ fontSize: "1rem", padding: "12px 26px" }}
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Demo
            </button>
          </div>

          {/* Stats row */}
          <div className="animate-fade-up animate-delay-4" style={{ display: "flex", gap: 32, marginTop: 48 }}>
            {[
              { value: "3s", label: "API generated" },
              { value: "100%", label: "No backend needed" },
              { value: "∞", label: "Mock endpoints" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>{value}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", fontWeight: 500, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Code mockup card */}
        <div
          className="animate-float animate-delay-2"
          style={{ position: "relative" }}
        >
          {/* Glow behind card */}
          <div
            style={{
              position: "absolute",
              inset: -24,
              background: "radial-gradient(ellipse at center, rgba(0,113,227,0.12) 0%, transparent 70%)",
              borderRadius: "50%",
              filter: "blur(20px)",
              pointerEvents: "none",
            }}
          />

          {/* Main card */}
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              boxShadow: "var(--shadow-xl), 0 0 0 1px rgba(0,0,0,0.03)",
              overflow: "hidden",
            }}
          >
            {/* Window chrome */}
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(0,0,0,0.02)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                {["#FF5F57", "#FFC02C", "#29CF42"].map((c) => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
                ))}
              </div>
              <span style={{ flex: 1, textAlign: "center", fontSize: "0.78rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                schema.json → /api/mock/users
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {/* Schema input */}
              <div style={{ padding: 20, borderRight: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>
                  JSON Schema
                </div>
                <pre
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.75,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    tabSize: 2,
                  }}
                >
                  {CODE_SNIPPET}
                </pre>
              </div>

              {/* Generated response */}
              <div style={{ padding: 20, background: "rgba(0,113,227,0.02)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>
                  Mock Response ✓
                </div>
                <pre
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.75,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {RESPONSE_SNIPPET}
                </pre>
              </div>
            </div>

            {/* Bottom status bar */}
            <div
              style={{
                padding: "10px 16px",
                background: "rgba(0,0,0,0.02)",
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#29CF42", boxShadow: "0 0 6px rgba(41,207,66,0.6)" }} />
              <span style={{ fontSize: "0.73rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                Mock server running · 2 endpoints active
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
