"use client";

import Link from "next/link";

const links = [
  { label: "About", href: "#" },
  { label: "GitHub", href: "https://github.com" },
  { label: "Contact", href: "#" },
  { label: "Docs", href: "#" },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--bg-elevated)",
        borderTop: "1px solid var(--border)",
        padding: "48px 0 32px",
      }}
    >
      <div className="container-default">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
            marginBottom: 36,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "linear-gradient(145deg, #0071e3 0%, #34aadc 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,113,227,0.28)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M3 9h12M9 3l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              ApiMate
            </span>
          </div>

          {/* Links */}
          <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {links.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  borderRadius: 8,
                  transition: "all 0.15s ease",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)";
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,0,0,0.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)";
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div style={{ height: 1, background: "var(--border)", marginBottom: 24 }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", margin: 0 }}>
            © {new Date().getFullYear()} ApiMate. Build frontends without limits.
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", margin: 0 }}>
            Made with ♥ for frontend developers
          </p>
        </div>
      </div>
    </footer>
  );
}
