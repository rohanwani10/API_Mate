"use client";

import { useState } from "react";
import { Play, Wand2, AlertTriangle } from "lucide-react";
import CopyButton from "./CopyButton";
import { buildMockUrl } from "@/lib/mockgen";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type Method = (typeof METHODS)[number];

const METHOD_COLORS: Record<Method, string> = {
  GET: "bg-[#30d158]/15 text-[#1e9d3b]",
  POST: "bg-[#0071e3]/15 text-[var(--accent)]",
  PUT: "bg-[#0071e3]/15 text-[var(--accent)]",
  PATCH: "bg-[#ff9f0a]/15 text-[#b26b00]",
  DELETE: "bg-[#ff3b30]/15 text-[#d70015]",
};

type Result = {
  status: number;
  ok: boolean;
  ms: number;
  body: string;
};

/** Pretty-print when the response is JSON; show it verbatim when it isn't. */
function formatBody(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function statusClass(status: number): string {
  if (status >= 500) return "bg-red-50 text-red-700 border-red-200";
  if (status >= 400) return "bg-orange-50 text-orange-700 border-orange-200";
  if (status >= 300) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-[#30d158]/10 text-[#1e9d3b] border-[#30d158]/30";
}

export default function TryItPanel({
  contractId,
  contractPath,
  versionNumbers,
  baseUrl,
}: {
  contractId: string;
  contractPath: string;
  versionNumbers: number[];
  baseUrl: string;
}) {
  const [method, setMethod] = useState<Method>("GET");
  const [version, setVersion] = useState(versionNumbers[0] ?? 1);
  const [count, setCount] = useState("");
  const [delay, setDelay] = useState("");
  const [forcedStatus, setForcedStatus] = useState("");
  const [seed, setSeed] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<"send" | "fill" | null>(null);
  const [error, setError] = useState("");

  const sendsBody = method === "POST" || method === "PUT" || method === "PATCH";

  const buildUrl = (overrides?: Record<string, string>) => {
    // `baseUrl` is empty until the parent's mount effect reads window.location.
    // Without this guard `new URL("/api/mock/...")` throws during render, since
    // a relative string is not a valid absolute URL.
    if (!baseUrl) return "";

    const url = new URL(buildMockUrl(baseUrl, contractId, version, contractPath));
    const params: Record<string, string> = {
      ...(count ? { count } : {}),
      ...(delay ? { delay } : {}),
      ...(forcedStatus ? { status: forcedStatus } : {}),
      ...(seed ? { seed } : {}),
      ...overrides,
    };
    // Empty values are dropped rather than sent blank — `?count=` would reach
    // the route as a present-but-unparseable param and be rejected as a 400.
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
    return url.toString();
  };

  const send = async () => {
    setBusy("send");
    setError("");
    const startedAt = performance.now();
    try {
      const res = await fetch(buildUrl(), {
        method,
        ...(sendsBody
          ? {
              headers: { "Content-Type": "application/json" },
              body: body.trim() || "{}",
            }
          : {}),
      });
      const text = await res.text();
      setResult({
        status: res.status,
        ok: res.ok,
        ms: Math.round(performance.now() - startedAt),
        body: formatBody(text),
      });
    } catch (e) {
      // A network-level failure never reaches the status branch above, so it is
      // reported separately rather than being shown as a misleading 0 response.
      setError(e instanceof Error ? e.message : "Request failed");
      setResult(null);
    } finally {
      setBusy(null);
    }
  };

  // Prefills the request body by asking the endpoint itself for a schema-valid
  // sample, rather than duplicating the generator on the client.
  const fillBody = async () => {
    setBusy("fill");
    setError("");
    try {
      const res = await fetch(buildUrl({ mode: "fast", count: "" }));
      const text = await res.text();
      setBody(formatBody(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a sample body");
    } finally {
      setBusy(null);
    }
  };

  if (versionNumbers.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-orange-50/50 border border-orange-200 text-orange-700 p-5 rounded-[var(--radius-lg)] text-[0.95rem] font-medium flex items-center gap-3 shadow-sm">
          <AlertTriangle size={20} className="text-orange-500 shrink-0" />
          Publish a schema version first — there is nothing to call yet.
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg px-3 py-2 outline-none text-[0.85rem] text-[var(--text-primary)] font-mono focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] transition-all";
  const labelCls =
    "block text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5";

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Request line */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
          className={`${METHOD_COLORS[method]} font-bold text-[0.8rem] tracking-wider px-3 py-2 rounded-lg border-none outline-none cursor-pointer`}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={version}
          onChange={(e) => setVersion(Number(e.target.value))}
          className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-[0.8rem] font-mono outline-none cursor-pointer text-[var(--text-primary)]"
          title="Any published version can be called, not just the latest"
        >
          {versionNumbers.map((n) => (
            <option key={n} value={n}>
              v{n}
            </option>
          ))}
        </select>

        <code className="flex-1 min-w-0 text-[0.8rem] text-[var(--text-secondary)] font-mono break-all bg-[var(--bg-base)] px-3 py-2 rounded-lg border border-[var(--border)]">
          {buildUrl()}
        </code>

        <CopyButton text={buildUrl()} label="URL" />
      </div>

      {/* Simulation knobs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[var(--bg-base)] rounded-[var(--radius-md)] border border-[var(--border)]">
        <div>
          <label className={labelCls}>Count</label>
          <input
            className={inputCls}
            placeholder="1"
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} title="Artificial latency, max 10000ms">
            Delay (ms)
          </label>
          <input
            className={inputCls}
            placeholder="0"
            value={delay}
            onChange={(e) => setDelay(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} title="Force a status code to test error handling">
            Force status
          </label>
          <input
            className={inputCls}
            placeholder="200"
            value={forcedStatus}
            onChange={(e) => setForcedStatus(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} title="Same seed returns identical data every call">
            Seed
          </label>
          <input
            className={inputCls}
            placeholder="none"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
        </div>
      </div>

      {/* Body */}
      {sendsBody && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls + " mb-0"}>Request body</label>
            <button
              onClick={fillBody}
              disabled={busy !== null || !baseUrl}
              className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent-glow)] cursor-pointer transition-all disabled:opacity-50"
            >
              <Wand2 size={13} strokeWidth={2.5} />
              {busy === "fill" ? "Generating" : "Fill from schema"}
            </button>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            rows={8}
            placeholder={"{\n  \"id\": 1\n}"}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg p-4 outline-none text-[0.85rem] font-mono text-[var(--text-primary)] resize-y focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] transition-all"
          />
        </div>
      )}

      <button
        onClick={send}
        disabled={busy !== null || !baseUrl}
        className="button-primary h-[42px] w-fit px-6"
        style={{ opacity: busy !== null || !baseUrl ? 0.6 : 1 }}
      >
        <Play size={16} />
        {busy === "send" ? "Sending..." : "Send Request"}
      </button>

      {error && (
        <div className="flex items-start gap-2.5 text-[0.85rem] text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg font-medium">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span
              className={`px-2.5 py-1 rounded-md text-[0.75rem] font-bold tracking-wider border ${statusClass(result.status)}`}
            >
              {result.status} {result.ok ? "OK" : "ERROR"}
            </span>
            <span className="text-[0.75rem] font-mono text-[var(--text-secondary)]">
              {result.ms} ms
            </span>
            <div className="ml-auto">
              <CopyButton text={result.body} label="Response" />
            </div>
          </div>
          <pre className="m-0 p-4 max-h-[320px] overflow-auto bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg font-mono text-[0.8rem] leading-relaxed text-[var(--text-primary)]">
            {result.body}
          </pre>
        </div>
      )}
    </div>
  );
}
