"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { ArrowLeft, Send, Sparkles, Check, AlertTriangle, Code, Play } from "lucide-react";
import Link from "next/link";
import { generateDartCode, generateJavaCode } from "@/lib/codegen";

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
  const [activeTab, setActiveTab] = useState<"editor" | "dart" | "java" | "mock">("editor");

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
  }, [data]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError("");
    
    // Client-side quick check
    try {
      const parsed = JSON.parse(schemaInput);
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
        throw new Error("SCHEMA_TYPE_ERROR: Expected a JSON object {}");
      }
    } catch (e: any) {
      setPublishError(e.message?.startsWith("SCHEMA_TYPE_ERROR") ? e.message : "JSON_PARSE_ERROR: Invalid syntax");
      setIsPublishing(false);
      return;
    }

    try {
      await publishVersion({ contractId, schema: schemaInput });
    } catch (e: any) {
      setPublishError(e.message || "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAskAi = async () => {
    if (!chatInput.trim()) return;
    setIsAiLoading(true);
    // append current schema for context (simple approach)
    const prompt = `Here is the current schema:\n\n${schemaInput}\n\nUser Request: ${chatInput}`;
    try {
      const newSchema = await generateSchema({ prompt });
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
    return <div className="text-[var(--primary)] font-mono animate-pulse">BOOTING_WORKSPACE...</div>;
  }
  if (data === null) {
    return <div className="text-red-500 font-mono">WORKSPACE_CORRUPTED</div>;
  }

  const { contract, versions } = data;
  const latestVersion = versions[0];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in relative z-10">

      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-4">
        <div>
          <Link href={`/dashboard/${projectId}`} className="text-[var(--primary)] hover:text-white transition-colors flex items-center gap-2 font-mono text-xs w-fit mb-2">
            <ArrowLeft className="w-4 h-4" /> REVERT
          </Link>
          <h1 className="text-2xl text-white font-display tracking-wider uppercase">
            {contract.name} <span className="text-[var(--secondary-foreground)] text-sm ml-2">[{contract.path}]</span>
          </h1>
        </div>
        <div className="flex gap-4">
          {publishError && <span className="text-red-500 font-mono text-xs self-center bg-red-500/10 px-2 py-1 border border-red-500/50">{publishError}</span>}
          <button onClick={handlePublish} disabled={isPublishing} className="button-primary">
            {isPublishing ? "COMMITTING..." : "PUBLISH_VERSION"}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-0">

        {/* Left Column: Versions */}
        <div className="lg:col-span-1 panel flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] bg-black/40">
            <h3 className="text-white font-mono text-sm tracking-widest uppercase">Version_History</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {versions.length === 0 ? (
              <div className="text-[var(--secondary-foreground)] font-mono text-xs opacity-50">NO_VERSIONS</div>
            ) : (
              versions.map((v, i) => (
                <div key={v._id} className={`p-3 border ${i === 0 ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)]'} text-sm`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-mono font-bold">v{v.versionNumber}</span>
                    {i === 0 && <span className="text-[var(--primary)] text-[10px] uppercase tracking-wider px-1 bg-[var(--primary)]/20">LATEST</span>}
                  </div>
                  {v.breakingChanges && v.breakingChanges.length > 0 && (
                    <div className="text-red-400 text-[10px] mt-2 border-t border-red-500/20 pt-2 space-y-1">
                      <span className="flex items-center gap-1 font-bold"><AlertTriangle className="w-3 h-3" /> BREAKING</span>
                      {v.breakingChanges.map((bc, idx) => (
                        <div key={idx} className="font-mono opacity-80">- {bc.message}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Middle Column: Active Editor & Chat */}
        <div className="lg:col-span-3 flex flex-col gap-6 h-full min-h-0">

          {/* Output / Editor Switcher */}
          <div className="panel flex-1 flex flex-col min-h-0 relative">
            <div className="absolute top-0 right-0 p-2 flex gap-2 z-10 bg-black/50 border-b border-l border-[var(--border)] backdrop-blur-md pb-1 pl-2">
              {(["editor", "dart", "java", "mock"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`font-mono text-xs px-3 py-1 uppercase ${activeTab === tab ? 'text-[var(--primary)] border border-[var(--primary)]' : 'text-white opacity-50 hover:opacity-100 transition-opacity'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 relative bg-[#0a0a0a] overflow-hidden">
              {activeTab === "editor" && (
                <textarea
                  value={schemaInput}
                  onChange={(e) => setSchemaInput(e.target.value)}
                  className="w-full h-full p-6 text-[var(--primary)] font-mono text-sm leading-relaxed bg-transparent focus:outline-none resize-none"
                  spellCheck="false"
                />
              )}
              {activeTab === "dart" && (
                <pre className="w-full h-full p-6 text-yellow-400 font-mono text-sm leading-relaxed overflow-auto">
                  {generateDartCode("ContractModel", schemaInput)}
                </pre>
              )}
              {activeTab === "java" && (
                <pre className="w-full h-full p-6 text-orange-400 font-mono text-sm leading-relaxed overflow-auto">
                  {generateJavaCode("ContractModel", schemaInput)}
                </pre>
              )}
              {activeTab === "mock" && (
                <div className="p-6 text-white font-mono h-full overflow-auto space-y-4">
                  <h2 className="text-lg text-[var(--primary)] mb-4">Active Endpoints</h2>
                  {latestVersion ? (
                    <div className="space-y-4">
                      <div className="border border-[var(--border)] p-4 bg-black">
                        <div className="flex gap-2 items-center mb-2">
                          <span className="bg-green-500/20 text-green-400 px-2 py-1 text-xs font-bold border border-green-500/50">GET</span>
                          <span className="text-sm opacity-80 break-all">{mockBaseUrl}/api/mock/{contract._id}/{latestVersion.versionNumber}</span>
                        </div>
                        <p className="text-xs text-[var(--secondary-foreground)]">Generate random mock data matching schema v{latestVersion.versionNumber}</p>
                      </div>

                      <div className="border border-[var(--border)] p-4 bg-black">
                        <div className="flex gap-2 items-center mb-2">
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 text-xs font-bold border border-blue-500/50">POST</span>
                          <span className="text-sm opacity-80 break-all">{mockBaseUrl}/api/mock/{contract._id}/{latestVersion.versionNumber}</span>
                        </div>
                        <p className="text-xs text-[var(--secondary-foreground)]">Validate incoming request body against schema v{latestVersion.versionNumber}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-400">PUBLISH_VERSION_FIRST</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* AI Chat Input */}
          <div className="panel p-4 flex gap-4 items-center shrink-0">
            <div className="bg-[var(--primary)] p-2 shrink-0">
              {isAiLoading ? <Sparkles className="w-5 h-5 text-black animate-spin" /> : <Code className="w-5 h-5 text-black" />}
            </div>
            <input
              type="text"
              className="flex-1 bg-transparent border-none text-white font-mono text-sm focus:outline-none placeholder:opacity-40"
              placeholder="Instruct AI to modify schema (e.g., 'Add email and password fields')..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAskAi();
              }}
              disabled={isAiLoading}
            />
            <button
              onClick={handleAskAi}
              disabled={isAiLoading || !chatInput.trim()}
              className="text-[var(--primary)] hover:text-white transition-colors disabled:opacity-50"
            >
              <Play className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
