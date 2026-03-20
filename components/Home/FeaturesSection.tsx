"use client";

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    ),
    title: "JSON → API Conversion",
    description: "Paste any JSON schema and instantly receive a fully-functional mock API endpoint — no config required.",
    color: "#0071e3",
    bg: "rgba(0,113,227,0.07)",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    title: "Dynamic Endpoint Generation",
    description: "Endpoints generate realistic, schema-consistent mock data. Refresh for new permutations every time.",
    color: "#5e5ce6",
    bg: "rgba(94,92,230,0.07)",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
      </svg>
    ),
    title: "Zero Backend Dependency",
    description: "Work in complete isolation from the backend team. Your frontend never blocks on an unfinished API.",
    color: "#30d158",
    bg: "rgba(48,209,88,0.07)",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
      </svg>
    ),
    title: "Seamless API Replacement",
    description: "When your real backend is ready, swap a single base URL. No code changes on the frontend side.",
    color: "#ff9f0a",
    bg: "rgba(255,159,10,0.07)",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: "Project Dashboard",
    description: "Manage all your mock API projects from a clean, organized dashboard. Create, edit, and share with ease.",
    color: "#ff375f",
    bg: "rgba(255,55,95,0.07)",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      style={{ padding: "100px 0", background: "var(--bg-elevated)" }}
    >
      <div className="container-default">
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
              Everything you need
            </span>
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", marginBottom: 16 }}>
            Built for Frontend Velocity
          </h2>
          <p style={{ fontSize: "1.05rem", maxWidth: 520, margin: "0 auto", color: "var(--text-secondary)" }}>
            Stop waiting on the backend. ApiMate gives you all the tools to
            build fast, test thoroughly, and integrate seamlessly.
          </p>
        </div>

        {/* Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {features.map((feat, i) => (
            <div
              key={feat.title}
              className="feature-card animate-fade-up"
              style={{ animationDelay: `${i * 0.07}s`, opacity: 0 }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: feat.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: feat.color,
                  marginBottom: 18,
                }}
              >
                {feat.icon}
              </div>

              <h3
                style={{
                  fontSize: "1.02rem",
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {feat.title}
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

