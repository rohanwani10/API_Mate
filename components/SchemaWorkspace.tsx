"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, AlertTriangle, Code, History, Play, Link as LinkIcon, Smartphone, Coffee, ScrollText, FileCode2 } from "lucide-react";
import Link from "next/link";
import { generateDartCode, generateJavaCode, generateTypeScriptCode } from "@/lib/codegen";
import { buildMockUrl } from "@/lib/mockgen";
import CopyButton from "./CopyButton";
import TryItPanel from "./TryItPanel";
import RequestLogs from "./RequestLogs";

type Tab = "history" | "try" | "logs" | "mock" | "ts" | "dart" | "java";

const TABS: Tab[] = ["history", "try", "logs", "mock", "ts", "dart", "java"];

const TAB_LABELS: Record<Tab, string> = {
  history: "History",
  try: "Try It",
  logs: "Logs",
  mock: "Endpoints",
  ts: "TypeScript",
  dart: "Dart",
  java: "Java",
};

/**
 * Derives a usable type/class name from the contract name, so generated code
 * says `UserProfile` rather than a generic placeholder. Falls back when the
 * name has no usable letters (e.g. "123" or "///").
 */
function toPascalCase(name: string): string {
  const cleaned = name
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return /^[A-Za-z]/.test(cleaned) ? cleaned : "ContractModel";
}

/** A read-only code view with a copy button in its header. */
function CodePane({ code, tone }: { code: string; tone: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-base)] shrink-0">
        <CopyButton text={code} />
      </div>
      <pre className={`m-0 p-6 w-full flex-1 overflow-auto font-mono text-[0.875rem] leading-relaxed ${tone}`}>
        {code}
      </pre>
    </div>
  );
}

export default function SchemaWorkspace({
  projectId,
  contractId
}: {
  projectId: Id<"projects">,
  contractId: Id<"contracts">
}) {
  const data = useQuery(api.contracts.getContractWithVersions, { contractId });
  const publishVersion = useMutation(api.contracts.createVersion);
  const generateSchema = useAction(api.ai.generateSchema);

  const [schemaInput, setSchemaInput] = useState<string>("{\n  \"type\": \"object\",\n  \"properties\": {}\n}");
  const [chatInput, setChatInput] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [publishError, setPublishError] = useState("");
  
  // New tab state: 'history' instead of 'editor' since editor is always visible
  const [activeTab, setActiveTab] = useState<Tab>("history");

  const [mockBaseUrl, setMockBaseUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMockBaseUrl(window.location.origin);
    }
  }, []);

  // Sync editor to latest version only once on load
  useEffect(() => {
    if (data?.versions && data.versions.length > 0 && schemaInput === "{\n  \"type\": \"object\",\n  \"properties\": {}\n}") {
      setSchemaInput(data.versions[0].schema);
    }
  }, [data, schemaInput]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError("");

    // Client-side quick check
    try {
      const parsed = JSON.parse(schemaInput);
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
        throw new Error("SCHEMA_TYPE_ERROR: Expected a JSON object {}");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "JSON_PARSE_ERROR: Invalid syntax";
      setPublishError(message.startsWith("SCHEMA_TYPE_ERROR") ? message : "JSON_PARSE_ERROR: Invalid syntax");
      setIsPublishing(false);
      return;
    }

    try {
      await publishVersion({ contractId, schema: schemaInput });
      setActiveTab("history"); // auto switch to history to show success
    } catch (e: unknown) {
      setPublishError(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAskAi = async () => {
    if (!chatInput.trim()) return;
    setIsAiLoading(true);
    try {
      // Pass the user instruction and the current schema as separate arguments.
      // This keeps the 500-char cap enforced on the instruction only — the schema
      // is trusted content from our own editor state and is handled separately.
      const newSchema = await generateSchema({
        instruction: chatInput,
        currentSchema: schemaInput,
      });
      setSchemaInput(newSchema);
      setChatInput("");
    } catch (e) {
      console.error("AI Error:", e);
      alert("Failed to get AI response.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (data === undefined) {
    return (
      <div className="flex justify-center items-center h-full text-[var(--text-tertiary)] animate-pulse font-medium">
        Loading Workspace...
      </div>
    );
  }
  if (data === null) {
    return <div className="text-red-500 p-8 font-medium">Workspace not found or corrupted.</div>;
  }

  const { contract, versions } = data;
  const latestVersion = versions[0];
  const modelName = toPascalCase(contract.name);
  const endpointUrl =
    latestVersion && mockBaseUrl
      ? buildMockUrl(mockBaseUrl, contract._id, latestVersion.versionNumber, contract.path)
      : undefined;

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "history": return <History size={16} />;
      case "try": return <Play size={16} />;
      case "logs": return <ScrollText size={16} />;
      case "mock": return <LinkIcon size={16} />;
      case "ts": return <FileCode2 size={16} />;
      case "dart": return <Smartphone size={16} />;
      case "java": return <Coffee size={16} />;
      default: return null;
    }
  };

  return (
    <div className="animate-fade-in flex flex-col h-auto lg:h-[calc(100vh-120px)] z-10 w-full max-w-[1600px] mx-auto">

      {/* Top Banner (Always visible) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-5 mb-5 shrink-0">
        <div className="min-w-0">
          <Link
            href={`/dashboard/${projectId}`}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 text-sm font-medium w-fit mb-3"
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Back to Project
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] m-0 flex flex-wrap items-baseline gap-3 tracking-tight">
            {contract.name}
            <span className="text-[var(--text-secondary)] text-sm font-mono font-medium px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md break-all">
              {contract.path}
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {publishError && (
            <span className="text-red-600 text-xs bg-red-50 px-3 py-1.5 rounded-md font-semibold border border-red-100">
              {publishError}
            </span>
          )}
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="button-primary h-[40px] px-6 text-sm w-full sm:w-auto"
          >
            {isPublishing ? "Publishing..." : "Publish Version"}
          </button>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        
        {/* Left Column: Schema Editor & AI */}
        <div className="panel flex flex-col h-[480px] lg:h-full min-h-0 overflow-hidden shadow-[var(--shadow-sm)] border-[var(--border)] bg-[var(--bg-elevated)]">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg-base)]">
            <span className="text-xs font-bold tracking-wider text-[var(--text-secondary)] uppercase flex items-center gap-2">
              <Code size={14} className="text-[var(--accent)]" />
              JSON Schema Editor
            </span>
          </div>

          <div className="flex-1 relative bg-[#fcfcfd] min-h-0">
            <textarea
              value={schemaInput}
              onChange={(e) => setSchemaInput(e.target.value)}
              className="w-full h-full p-6 border-none bg-transparent text-[var(--text-primary)] font-mono text-[0.925rem] leading-relaxed resize-none outline-none focus:ring-0"
              spellCheck="false"
              placeholder="Enter your JSON Schema here..."
            />
          </div>

          {/* AI Chat Input - Fixed at bottom of editor */}
          <div className="border-t border-[var(--border)] p-3 bg-[var(--bg-base)] flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <div className="bg-[var(--accent-light)] text-[var(--accent)] w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-[var(--accent-glow)]">
              {isAiLoading ? <Sparkles size={18} className="animate-spin" /> : <Sparkles size={18} />}
            </div>

            <input
              type="text"
              className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl px-4 py-2.5 outline-none text-[0.95rem] text-[var(--text-primary)] font-sans focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] transition-all shadow-sm w-full min-w-0"
              placeholder="Instruct AI to modify schema (e.g., 'Add email field')..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
              disabled={isAiLoading}
            />

            <button
              onClick={handleAskAi}
              disabled={isAiLoading || !chatInput.trim()}
              className="button-primary h-[42px] px-5 sm:w-auto w-full shrink-0"
              style={{ opacity: (isAiLoading || !chatInput.trim()) ? 0.6 : 1 }}
            >
              <Sparkles size={16} />
              {isAiLoading ? "Processing" : "Generate"}
            </button>
          </div>
        </div>

        {/* Right Column: Output & History */}
        <div className="panel flex flex-col h-[480px] lg:h-full min-h-0 overflow-hidden shadow-[var(--shadow-sm)] border-[var(--border)] bg-[var(--bg-elevated)]">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[var(--border)] bg-[var(--bg-base)] overflow-x-auto scrollbar-hide shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 text-[0.75rem] font-bold uppercase tracking-wider px-4 py-2 rounded-lg border-none cursor-pointer transition-all duration-200 shrink-0 ${activeTab === tab ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border-strong)]" : "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/50"}`}
              >
                {getTabIcon(tab)}
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto bg-[#fcfcfd]">
            {/* HISTORY TAB */}
            {activeTab === "history" && (
              <div className="flex flex-col gap-4 p-6 h-full">
                {versions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] gap-3 opacity-60">
                    <History size={48} strokeWidth={1} />
                    <span className="text-[0.95rem] font-medium">No versions published yet.</span>
                  </div>
                ) : (
                  versions.map((v, i) => (
                    <div
                      key={v._id}
                      className={`p-5 rounded-xl border transition-all duration-200 ${i === 0 ? "border-[var(--accent)] bg-[var(--bg-elevated)] shadow-[0_2px_12px_rgba(0,113,227,0.12)]" : "border-[var(--border)] bg-[var(--bg-base)]"}`}
                    >
                      <div className={`flex justify-between items-center ${v.breakingChanges?.length ? "mb-3" : "mb-0"}`}>
                        <span className={`font-bold ${i === 0 ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                          Version {v.versionNumber}
                        </span>
                        {i === 0 && (
                          <span className="text-[0.65rem] font-bold text-white bg-[var(--accent)] px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm">
                            Latest
                          </span>
                        )}
                      </div>

                      {v.breakingChanges && v.breakingChanges.length > 0 && (
                        <div className="border-t border-[var(--border-strong)] pt-3 flex flex-col gap-2 mt-2">
                          <span className="flex items-center gap-1.5 text-[0.75rem] font-bold text-red-600 uppercase tracking-wider">
                            <AlertTriangle size={14} strokeWidth={2.5} /> Breaking Changes
                          </span>
                          {v.breakingChanges.map((bc, idx) => (
                            <div key={idx} className="text-[0.85rem] text-[var(--text-secondary)] leading-relaxed font-medium bg-red-50/50 p-2 rounded-md border border-red-100">
                              • {bc.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TRY IT TAB */}
            {activeTab === "try" && (
              <TryItPanel
                contractId={contract._id}
                contractPath={contract.path}
                versionNumbers={versions.map((v) => v.versionNumber)}
                baseUrl={mockBaseUrl}
              />
            )}

            {/* LOGS TAB */}
            {activeTab === "logs" && <RequestLogs contractId={contract._id} />}

            {/* TYPESCRIPT TAB */}
            {activeTab === "ts" && (
              <CodePane
                tone="text-[#1d4ed8]"
                code={generateTypeScriptCode(modelName, schemaInput, endpointUrl)}
              />
            )}

            {/* DART TAB */}
            {activeTab === "dart" && (
              <CodePane tone="text-[#005b9f]" code={generateDartCode(modelName, schemaInput)} />
            )}

            {/* JAVA TAB */}
            {activeTab === "java" && (
              <CodePane tone="text-[#b07000]" code={generateJavaCode(modelName, schemaInput)} />
            )}

            {/* MOCK ENDPOINTS TAB */}
            {activeTab === "mock" && (
              <div className="flex flex-col gap-6 p-6 h-full">
                <h2 className="text-[1.15rem] font-bold text-[var(--text-primary)] m-0 tracking-tight border-b border-[var(--border)] pb-3">Active Endpoints</h2>
                
                {latestVersion ? (
                  <div className="flex flex-col gap-5">
                    {[
                      {
                        method: "GET",
                        badgeClass: "bg-[#30d158]/15 text-[#1e9d3b]",
                        desc: `Generates random mock data matching schema v${latestVersion.versionNumber}`,
                      },
                      {
                        method: "POST",
                        badgeClass: "bg-[#0071e3]/15 text-[var(--accent)]",
                        desc: `Validates the full payload against schema v${latestVersion.versionNumber}; creates the resource on success`,
                      },
                      {
                        method: "PUT",
                        badgeClass: "bg-[#0071e3]/15 text-[var(--accent)]",
                        desc: `Validates the full payload against schema v${latestVersion.versionNumber}; replaces the resource on success`,
                      },
                      {
                        method: "PATCH",
                        badgeClass: "bg-[#ff9f0a]/15 text-[#b26b00]",
                        desc: `Validates only the submitted fields against schema v${latestVersion.versionNumber}; partially updates the resource`,
                      },
                      {
                        method: "DELETE",
                        badgeClass: "bg-[#ff3b30]/15 text-[#d70015]",
                        desc: `Simulates deleting the resource defined by schema v${latestVersion.versionNumber}`,
                      },
                    ].map((ep) => (
                      <div
                        key={ep.method}
                        className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-5 shadow-sm transition-hover hover:border-[var(--accent-glow)]"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`${ep.badgeClass} px-2.5 py-1 rounded-md text-[0.75rem] font-bold tracking-wider shrink-0`}>
                            {ep.method}
                          </span>
                          <span className="font-mono text-[0.85rem] text-[var(--text-primary)] break-all font-medium">
                            {endpointUrl}
                          </span>
                          <div className="ml-auto">
                            <CopyButton text={endpointUrl ?? ""} />
                          </div>
                        </div>
                        <p className="m-0 text-[0.85rem] text-[var(--text-secondary)] leading-relaxed">
                          {ep.desc}
                        </p>
                      </div>
                    ))}

                    {/* Simulation params reference — otherwise these are
                        undiscoverable without reading the source. */}
                    <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
                      <h3 className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--text-secondary)] m-0 mb-3">
                        Query Parameters
                      </h3>
                      <div className="flex flex-col gap-2.5">
                        {[
                          ["?count=10", "Return an array of N items (max 50)."],
                          ["?seed=demo", "Deterministic data — the same seed always returns the same bytes. Ideal for snapshot tests."],
                          ["?delay=800", "Wait N ms before responding (max 10000), to exercise loading states."],
                          ["?status=500", "Force a status code, to exercise error handling."],
                          ["?mode=fast", "Skip AI enhancement for an instant response."],
                        ].map(([param, desc]) => (
                          <div key={param} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                            <code className="font-mono text-[0.8rem] text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded shrink-0 w-fit sm:w-[110px]">
                              {param}
                            </code>
                            <span className="text-[0.82rem] text-[var(--text-secondary)] leading-relaxed">
                              {desc}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-orange-50/50 border border-orange-200 text-orange-700 p-5 rounded-[var(--radius-lg)] text-[0.95rem] font-medium flex items-center gap-3 shadow-sm">
                    <AlertTriangle size={20} className="text-orange-500" />
                    Publish a schema version first to unlock mock endpoints.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
