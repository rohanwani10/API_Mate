"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const NAV_LINKS = ["Home", "Features", "Docs"];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu automatically if the viewport grows past the
  // breakpoint where the inline nav takes over (e.g. rotating a tablet).
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        transition: "all 0.3s ease",
        background: scrolled
          ? "rgba(255, 255, 255, 0.80)"
          : "rgba(245, 245, 247, 0.60)",
        backdropFilter: "blur(20px) saturate(1.8)",
        WebkitBackdropFilter: "blur(20px) saturate(1.8)",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        boxShadow: scrolled ? "var(--shadow-sm)" : "none",
      }}
    >
      <div
        className="container-default"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, paddingBottom: 14 }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(145deg, #0071e3 0%, #34aadc 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Image src="/API MATE.png" alt="Logo" width={36} height={36} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.08rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            ApiMate
          </span>
        </Link>

        {/* Desktop nav — hidden below md */}
        <nav className="hidden md:flex" style={{ alignItems: "center", gap: 6 }}>
          {NAV_LINKS.map((item) => (
            <Link
              key={item}
              href={item === "Home" ? "/" : `#${item.toLowerCase()}`}
              style={{
                padding: "6px 14px",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                textDecoration: "none",
                borderRadius: 8,
                transition: "all 0.15s ease",
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
              {item}
            </Link>
          ))}

          <div style={{ width: 1, height: 20, background: "var(--border-strong)", margin: "0 6px" }} />

          <SignedOut>
            <SignInButton mode="modal">
              <button className="button-primary" style={{ fontSize: "0.875rem", padding: "8px 18px" }}>
                Sign In
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <Link
              href="/dashboard"
              className="button-primary"
              style={{ fontSize: "0.875rem", padding: "8px 18px", textDecoration: "none" }}
            >
              Dashboard
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "rounded-full",
                },
              }}
            />
          </SignedIn>
        </nav>

        {/* Mobile controls — hidden at md and above */}
        <div className="flex md:hidden" style={{ alignItems: "center", gap: 10 }}>
          <SignedIn>
            <UserButton appearance={{ elements: { avatarBox: "rounded-full" } }} />
          </SignedIn>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            style={{
              padding: 8,
              background: "transparent",
              border: "1px solid var(--border-strong)",
              borderRadius: 8,
              color: "var(--text-primary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <nav
            className="container-default"
            style={{ display: "flex", flexDirection: "column", padding: "12px 24px 20px", gap: 4 }}
          >
            {NAV_LINKS.map((item) => (
              <Link
                key={item}
                href={item === "Home" ? "/" : `#${item.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: "10px 12px",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  borderRadius: 8,
                }}
              >
                {item}
              </Link>
            ))}

            <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />

            <SignedOut>
              <SignInButton mode="modal">
                <button className="button-primary" style={{ width: "100%", fontSize: "0.9rem", padding: "10px 18px" }}>
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Link
                href="/dashboard"
                className="button-primary"
                onClick={() => setMobileOpen(false)}
                style={{ width: "100%", fontSize: "0.9rem", padding: "10px 18px", textDecoration: "none" }}
              >
                Dashboard
              </Link>
            </SignedIn>
          </nav>
        </div>
      )}
    </header>
  );
}
