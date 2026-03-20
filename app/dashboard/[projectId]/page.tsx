"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Box, PlusSquare, ChevronRight, FileCode2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function ProjectView() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;
  
  const projects = useQuery(api.contracts.getProjects);
  const project = projects?.find((p) => p._id === projectId);
  const contracts = useQuery(api.contracts.getContracts, { projectId });
  
  const createContract = useMutation(api.contracts.createContract);
  
  const [newContractName, setNewContractName] = useState("");
  const [newContractPath, setNewContractPath] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractName.trim() || !newContractPath.trim()) return;
    setIsCreating(true);
    try {
      await createContract({ 
         projectId, 
         name: newContractName, 
         path: newContractPath 
      });
      setNewContractName("");
      setNewContractPath("");
    } finally {
      setIsCreating(false);
    }
  };

  if (projects === undefined || contracts === undefined) {
    return (
       <div className="flex items-center justify-center p-20 text-[var(--text-tertiary)] animate-pulse font-medium">
         Loading Project...
       </div>
    );
  }

  if (!project) {
    return <div className="text-red-500 p-20 text-center font-medium">Project not found</div>;
  }

  return (
    <div className="container-default py-10 animate-fade-in max-w-5xl">
      
      {/* Header */}
      <div className="mb-10">
        <Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 text-sm font-medium w-fit mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Back to Dashboard
        </Link>
        <div className="flex items-end justify-between border-b border-[var(--border)] pb-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
              <Box className="w-8 h-8 text-[var(--accent)] drop-shadow-sm" strokeWidth={1.5} />
              {project.name}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-3 font-mono bg-[var(--bg-elevated)] px-2 py-1 rounded inline-block border border-[var(--border)] shadow-sm">
              ID: {project._id}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        
        {/* Create Contract Panel */}
        <div className="panel p-8 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 mb-6 border-b border-[var(--border)] pb-4">
            <div className="bg-[var(--accent-light)] p-2 rounded-lg">
              <PlusSquare className="w-5 h-5 text-[var(--accent)]" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
              Define New API Contract
            </h3>
          </div>
          
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
             <div className="md:col-span-5">
                <label className="block text-[var(--text-secondary)] text-xs font-semibold mb-2 uppercase tracking-wide">Contract Name</label>
                <input 
                  type="text" 
                  required
                  className="input-field shadow-sm"
                  placeholder="e.g. User Profile"
                  value={newContractName}
                  onChange={(e) => setNewContractName(e.target.value)}
                />
             </div>
             <div className="md:col-span-5">
                <label className="block text-[var(--text-secondary)] text-xs font-semibold mb-2 uppercase tracking-wide">API Path</label>
                <input 
                  type="text" 
                  required
                  className="input-field font-mono text-sm shadow-sm"
                  placeholder="e.g. /api/users"
                  value={newContractPath}
                  onChange={(e) => setNewContractPath(e.target.value)}
                />
             </div>
             <div className="md:col-span-2">
               <button 
                 type="submit" 
                 disabled={isCreating}
                 className="button-primary w-full h-[41px]"
               >
                 {isCreating ? "Adding..." : "Add API"}
               </button>
             </div>
          </form>
        </div>

        {/* List Contracts */}
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight mb-4 flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-[var(--text-secondary)]" strokeWidth={2} />
            API Contracts
          </h2>
          
          <div className="space-y-4">
            {contracts.length === 0 ? (
               <div className="panel p-12 flex flex-col items-center justify-center border-dashed border-2 bg-transparent opacity-80 shadow-none">
                 <div className="bg-[var(--bg-elevated)] p-4 rounded-full mb-4 shadow-sm border border-[var(--border)]">
                   <FileCode2 className="w-6 h-6 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                 </div>
                 <span className="font-semibold text-[var(--text-primary)] mb-1">No APIs Defined</span>
                 <p className="text-sm text-[var(--text-secondary)] text-center max-w-sm">Use the form above to initialize a new API contract structure.</p>
               </div>
            ) : (
              contracts.map(c => (
                <Link 
                  key={c._id} 
                  href={`/dashboard/${projectId}/${c._id}`}
                  className="panel p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:border-[var(--accent-glow)] transition-all duration-300 cursor-pointer block hover:shadow-[var(--shadow-md)] bg-[var(--bg-elevated)] no-underline outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <div>
                    <h3 className="text-[1.1rem] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors inline-block">{c.name}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="bg-[var(--bg-base)] text-[var(--text-secondary)] px-2 py-0.5 rounded text-xs font-mono font-medium border border-[var(--border-strong)]">
                        {c.path}
                      </span>
                      <span className="text-[var(--text-tertiary)] font-mono text-[11px]">ID: {c._id.slice(0,8)}...</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-0 flex items-center gap-4 text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors bg-[var(--bg-base)] group-hover:bg-[var(--accent-light)] py-2 px-4 rounded-full font-medium text-sm">
                    <span>Open Editor</span>
                    <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
