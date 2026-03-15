"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[rgba(3,3,3,0.8)] backdrop-blur-md py-4">
      <div className="container-default flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="inline-flex h-10 w-10 items-center justify-center bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-xl shadow-[0_0_15px_rgba(0,255,204,0.5)] transition-transform group-hover:scale-110">
            A
          </span>
          <span className="text-xl font-display font-bold tracking-widest text-white group-hover:text-[var(--primary)] transition-colors">
            ApiMate <span className="text-[var(--primary)]">_</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="button-primary">Authenticate</button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <Link
              href="/dashboard"
              className="text-sm font-mono text-[var(--secondary-foreground)] hover:text-white transition-colors uppercase tracking-wider"
            >
              [ Dashboard ]
            </Link>
            <div className="h-6 w-px bg-[var(--border)] mx-2"></div>
            <UserButton 
               appearance={{
                 elements: {
                   avatarBox: "rounded-none border-2 border-[var(--primary)] shadow-[0_0_10px_rgba(0,255,204,0.3)]"
                 }
               }}
            />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
