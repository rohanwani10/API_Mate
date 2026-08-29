"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Copy-to-clipboard button used on endpoint URLs and every code-generation tab.
 *
 * `navigator.clipboard` is unavailable on insecure origins and can be blocked by
 * permissions, so a failure is surfaced in the button label rather than thrown —
 * a silent no-op would look identical to success.
 */
export default function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1600);
  };

  return (
    <button
      onClick={handleCopy}
      title={state === "failed" ? "Clipboard unavailable" : "Copy to clipboard"}
      className={`flex items-center gap-1.5 shrink-0 text-[0.7rem] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md border cursor-pointer transition-all duration-200 ${
        state === "copied"
          ? "bg-[#30d158]/15 text-[#1e9d3b] border-[#30d158]/30"
          : state === "failed"
            ? "bg-red-50 text-red-600 border-red-200"
            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:border-[var(--accent-glow)]"
      } ${className}`}
    >
      {state === "copied" ? <Check size={13} strokeWidth={3} /> : <Copy size={13} strokeWidth={2.5} />}
      {state === "copied" ? "Copied" : state === "failed" ? "Failed" : label}
    </button>
  );
}
