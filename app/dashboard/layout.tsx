"use client";

import Header from "@/components/Home/Header";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--primary)] opacity-[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-[var(--accent)] opacity-[0.02] blur-[100px] pointer-events-none" />
      
      <Header />
      
      <main className="flex-1 container-default relative z-10 pt-8">
        <Authenticated>
           {children}
        </Authenticated>
        <Unauthenticated>
          <div className="panel p-12 max-w-lg mx-auto mt-20 text-center animate-fade-in">
             <div className="w-16 h-1 bg-[var(--accent)] mx-auto mb-6"></div>
             <h2 className="text-3xl mb-4 text-white">Access Denied</h2>
             <p className="text-[var(--secondary-foreground)] font-mono text-sm mb-8">
               System requires valid authentication token. Please verify identity to access the guardian nexus.
             </p>
             <SignInButton mode="modal">
                <button className="button-primary w-full">Initiate Login Sequence</button>
             </SignInButton>
          </div>
        </Unauthenticated>
      </main>
    </div>
  );
}
