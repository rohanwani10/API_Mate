"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollText } from "lucide-react";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-[#30d158]/15 text-[#1e9d3b]",
  POST: "bg-[#0071e3]/15 text-[var(--accent)]",
  PUT: "bg-[#0071e3]/15 text-[var(--accent)]",
  PATCH: "bg-[#ff9f0a]/15 text-[#b26b00]",
  DELETE: "bg-[#ff3b30]/15 text-[#d70015]",
  OPTIONS: "bg-black/5 text-[var(--text-secondary)]",
};

function statusClass(status: number): string {
  if (status >= 500) return "bg-red-50 text-red-700 border-red-200";
  if (status >= 400) return "bg-orange-50 text-orange-700 border-orange-200";
  if (status >= 300) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-[#30d158]/10 text-[#1e9d3b] border-[#30d158]/30";
}

function relativeTime(ms: number): string {
  const seconds = Math.round((Date.now() - ms) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function RequestLogs({ contractId }: { contractId: Id<"contracts"> }) {
  // Convex queries are live, so requests sent from the Try It tab — or from a
  // frontend running elsewhere — appear here without a refresh.
  const logs = useQuery(api.contracts.getRequestLogs, { contractId });

  if (logs === undefined) {
    return (
      <div className="p-6 text-[var(--text-tertiary)] animate-pulse font-medium text-[0.9rem]">
        Loading requests...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] gap-3 opacity-60 p-6">
        <ScrollText size={48} strokeWidth={1} />
        <span className="text-[0.95rem] font-medium">No requests yet.</span>
        <span className="text-[0.85rem] text-center max-w-xs">
          Every call to this contract&apos;s mock endpoints shows up here — the newest 100 are kept.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-6">
      {logs.map((log) => (
        <div
          key={log._id}
          className="flex items-center gap-3 flex-wrap bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-3 shadow-sm"
        >
          <span
            className={`${METHOD_COLORS[log.method] ?? METHOD_COLORS.OPTIONS} px-2 py-0.5 rounded text-[0.7rem] font-bold tracking-wider shrink-0`}
          >
            {log.method}
          </span>

          <span
            className={`px-2 py-0.5 rounded text-[0.7rem] font-bold border shrink-0 ${statusClass(log.status)}`}
          >
            {log.status}
          </span>

          <span className="text-[0.75rem] font-mono text-[var(--text-tertiary)] shrink-0">
            v{log.versionNumber}
          </span>

          {log.query && (
            <code className="text-[0.75rem] font-mono text-[var(--text-secondary)] bg-[var(--bg-base)] px-2 py-0.5 rounded border border-[var(--border)] truncate max-w-[240px]">
              ?{log.query}
            </code>
          )}

          {log.error && (
            <span className="text-[0.75rem] text-red-600 font-medium truncate max-w-[220px]">
              {log.error}
            </span>
          )}

          <span className="ml-auto flex items-center gap-3 shrink-0 text-[0.75rem] font-mono text-[var(--text-secondary)]">
            <span>{log.durationMs} ms</span>
            <span className="text-[var(--text-tertiary)]">
              {relativeTime(log._creationTime)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
