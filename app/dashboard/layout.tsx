"use client";

import Sidebar from "@/components/Dashboard/Sidebar";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* Decorative background blur (Apple style) */}
      <div
        style={{
          position: "fixed",
          top: "-20%",
          left: "-10%",
          width: "50%",
          height: "50%",
          borderRadius: "50%",
          background: "var(--accent)",
          opacity: 0.05,
          filter: "blur(120px)",
          pointerEvents: "none",
        }}
      />

      <Authenticated>
        <Sidebar />
        <main
          style={{
            flex: 1,
            position: "relative",
            zIndex: 10,
            padding: "40px",
            maxHeight: "100vh",
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </Authenticated>

      <Unauthenticated>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%" }}>
          {/* Minimal Header for logged out state */}
          <header style={{ padding: "24px 40px", display: "flex", alignItems: "center" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9h12M9 3l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>ApiMate</span>
            </Link>
          </header>

          <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div className="modal-card" style={{ textAlign: "center", maxWidth: 420 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <h2 style={{ fontSize: "1.5rem", marginBottom: 12 }}>Authentication Required</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: 32, lineHeight: 1.6 }}>
                Please sign in with your account to access your ApiMate dashboard and projects.
              </p>
              <SignInButton mode="modal">
                <button className="button-primary" style={{ width: "100%", padding: "12px" }}>
                  Sign In to Continue
                </button>
              </SignInButton>
            </div>
          </main>
        </div>
      </Unauthenticated>
    </div>
  );
}
