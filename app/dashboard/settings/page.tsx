"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Power, RotateCcw, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function SettingsPage() {
  const projects = useQuery(api.contracts.getProjects);

  return (
    <div style={{ padding: "40px", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px", letterSpacing: "-0.03em" }}>
          Endpoint Controls
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "0.95rem" }}>
          Manage access and version history for all your project endpoints globally.
        </p>
        
        {projects === undefined ? (
          <div style={{ color: "var(--text-secondary)", animation: "pulse 2s infinite" }}>Loading projects...</div>
        ) : projects.length === 0 ? (
          <div style={{ background: "var(--bg-elevated)", padding: 32, borderRadius: 16, textAlign: "center", border: "1px solid var(--border)" }}>
            <p style={{ color: "var(--text-secondary)" }}>You don't have any projects yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {projects.map((project: any) => (
              <ProjectSettingsCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectSettingsCard({ project }: { project: any }) {
  const contracts = useQuery(api.contracts.getContracts, { projectId: project._id as Id<"projects"> });
  
  return (
    <div style={{ background: "var(--bg-elevated)", borderRadius: 16, padding: "24px 32px", boxShadow: "0 4px 24px rgba(0,0,0,0.02)", border: "1px solid var(--border)" }}>
       <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>{project.name}</h2>
       
       {contracts === undefined ? (
         <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading endpoints...</div>
       ) : contracts.length === 0 ? (
         <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", padding: "16px", background: "var(--bg-base)", borderRadius: 8, border: "1px dashed var(--border)" }}>
           No endpoints defined for this project.
         </p>
       ) : (
         <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
           {contracts.map((c: any) => (
             <ContractSettingsRow key={c._id} contract={c} />
           ))}
         </div>
       )}
    </div>
  );
}

function ContractSettingsRow({ contract }: { contract: any }) {
  const [expanded, setExpanded] = useState(false);
  const toggleStatus = useMutation(api.contracts.toggleContractStatus);
  const data = useQuery(api.contracts.getContractWithVersions, expanded ? { contractId: contract._id as Id<"contracts"> } : "skip");
  const restoreVersion = useMutation(api.contracts.restoreVersion);
  
  const [isToggling, setIsToggling] = useState(false);
  const [isRestoring, setIsRestoring] = useState<number | null>(null);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await toggleStatus({ contractId: contract._id as Id<"contracts"> });
    } finally {
      setIsToggling(false);
    }
  };
  
  const handleRestore = async (versionNumber: number) => {
    if (!window.confirm(`Are you sure you want to restore Version ${versionNumber}? This will be published as the new active version.`)) {
      return;
    }
    
    setIsRestoring(versionNumber);
    try {
      await restoreVersion({ contractId: contract._id as Id<"contracts">, versionNumber });
    } finally {
      setIsRestoring(null);
    }
  };

  return (
     <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, background: "var(--bg-base)", transition: "all 0.2sease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
           <div>
             <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h3 style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "1.05rem" }}>
                  {contract.name}
                </h3>
                {contract.isDisabled ? (
                  <span style={{ fontSize: "0.7rem", background: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: 12, fontWeight: 600, border: "1px solid #fecaca" }}>Disabled</span>
                ) : (
                  <span style={{ fontSize: "0.7rem", background: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: 12, fontWeight: 600, border: "1px solid #bbf7d0" }}>Active</span>
                )}
             </div>
             <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontFamily: "monospace" }}>
               GET {contract.path}
             </p>
           </div>
           
           <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button 
                onClick={handleToggle}
                disabled={isToggling}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: contract.isDisabled ? "var(--bg-elevated)" : "#fef2f2",
                  color: contract.isDisabled ? "var(--text-primary)" : "#dc2626",
                  border: `1px solid ${contract.isDisabled ? "var(--border)" : "#fca5a5"}`,
                  padding: "8px 14px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 500,
                  cursor: isToggling ? "wait" : "pointer", 
                  transition: "all 0.2s",
                  opacity: isToggling ? 0.7 : 1
                }}
              >
                <Power size={14} />
                {contract.isDisabled ? "Enable Endpoint" : "Disable Endpoint"}
              </button>
              
              <button 
                onClick={() => setExpanded(!expanded)}
                style={{ 
                  background: expanded ? "var(--border)" : "transparent", 
                  border: "none", 
                  cursor: "pointer", 
                  color: "var(--text-primary)", 
                  padding: 8,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
                title="View Versions"
              >
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
           </div>
        </div>
        
        {expanded && (
           <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12 }}>Version History</h4>
              
              {!data ? (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", padding: 12, background: "var(--bg-elevated)", borderRadius: 8, animation: "pulse 2s infinite" }}>Loading versions...</div>
              ) : data.versions.length === 0 ? (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", padding: 12, background: "var(--bg-elevated)", borderRadius: 8 }}>No versions published yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                   {data.versions.map((v: any, index: number) => (
                      <div key={v._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-elevated)", padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                         <div>
                           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                             <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>Version {v.versionNumber}</span>
                             {index === 0 && <span style={{ fontSize: "0.65rem", background: "var(--accent)", color: "#fff", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>CURRENT</span>}
                           </div>
                           {v.breakingChanges && v.breakingChanges.length > 0 && (
                             <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, color: "#d97706", fontSize: "0.75rem", background: "#fef3c7", padding: "2px 8px", borderRadius: 4, width: "fit-content" }}>
                               <AlertTriangle size={12} /> {v.breakingChanges.length} breaking changes from prev version
                             </div>
                           )}
                         </div>
                         <button 
                           onClick={() => handleRestore(v.versionNumber)}
                           disabled={index === 0 || isRestoring === v.versionNumber}
                           style={{
                             display: "flex", alignItems: "center", gap: 6,
                             background: index === 0 ? "transparent" : "var(--bg-base)",
                             color: index === 0 ? "var(--text-disabled)" : "var(--text-primary)",
                             border: index === 0 ? "none" : "1px solid var(--border)",
                             padding: index === 0 ? "6px" : "8px 14px", 
                             borderRadius: 8, 
                             fontSize: "0.85rem", 
                             fontWeight: 500,
                             cursor: index === 0 ? "default" : isRestoring === v.versionNumber ? "wait" : "pointer",
                             opacity: isRestoring === v.versionNumber ? 0.7 : 1,
                             boxShadow: index === 0 ? "none" : "0 1px 2px rgba(0,0,0,0.05)"
                           }}
                         >
                           {index !== 0 && <RotateCcw size={14} />}
                           {index === 0 ? "Active" : isRestoring === v.versionNumber ? "Restoring..." : "Restore Schema"}
                         </button>
                      </div>
                   ))}
                </div>
              )}
           </div>
        )}
     </div>
  );
}
