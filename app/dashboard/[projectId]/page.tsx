"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Box, PlusSquare } from "lucide-react";
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
       <div className="flex items-center justify-center p-20 animate-pulse font-mono text-[var(--primary)]">
         INITIATING_CONNECTION...
       </div>
    );
  }

  if (!project) {
    return <div className="text-red-500 font-mono">ERROR: PROJECT_NOT_FOUND</div>;
  }

  return (
    <div className="animate-fade-in space-y-10">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard" className="text-[var(--secondary-foreground)] hover:text-white transition-colors flex items-center gap-2 font-mono text-xs w-fit">
          <ArrowLeft className="w-4 h-4" /> CD ..
        </Link>
        <div className="flex items-end justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h1 className="text-4xl text-white flex items-center gap-3">
              <Box className="w-8 h-8 text-[var(--primary)]" />
              {project.name}
            </h1>
            <p className="font-mono text-[var(--secondary-foreground)] text-sm mt-2">
              ID: {project._id}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Contract Panel */}
        <div className="lg:col-span-1">
          <div className="panel p-6 sticky top-24">
            <h3 className="text-lg text-white mb-6 uppercase flex items-center gap-2 border-b border-[var(--border)] pb-4">
              <PlusSquare className="w-5 h-5 text-[var(--primary)]" />
              DEFINE_CONTRACT
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
               <div>
                  <label className="block font-mono text-[var(--secondary-foreground)] text-xs mb-1 uppercase">Contract Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-black/50 border border-[var(--border)] p-3 text-white font-mono text-sm focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_10px_rgba(0,255,204,0.2)]"
                    placeholder="e.g. User Profile"
                    value={newContractName}
                    onChange={(e) => setNewContractName(e.target.value)}
                  />
               </div>
               <div>
                  <label className="block font-mono text-[var(--secondary-foreground)] text-xs mb-1 uppercase">API Path</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-black/50 border border-[var(--border)] p-3 text-white font-mono text-sm focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_10px_rgba(0,255,204,0.2)]"
                    placeholder="e.g. /api/users"
                    value={newContractPath}
                    onChange={(e) => setNewContractPath(e.target.value)}
                  />
               </div>
               <button 
                 type="submit" 
                 disabled={isCreating}
                 className="button-primary w-full mt-4"
               >
                 {isCreating ? "PROVISIONING..." : "INITIALIZE"}
               </button>
            </form>
          </div>
        </div>

        {/* List Contracts */}
        <div className="lg:col-span-2 space-y-4">
          {contracts.length === 0 ? (
             <div className="panel p-10 flex flex-col items-center justify-center border-dashed border-2 opacity-60">
               <span className="font-mono text-[var(--secondary-foreground)] mb-2">NO_CONTRACTS_DEFINED</span>
               <p className="text-sm">Use the panel to initialize a new API contract.</p>
             </div>
          ) : (
            contracts.map(c => (
              <div key={c._id} className="panel p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:border-[var(--primary)] transition-colors">
                <div>
                  <h3 className="text-xl text-white group-hover:text-[var(--primary)] transition-colors">{c.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="bg-[var(--secondary)] text-[var(--secondary-foreground)] border border-[var(--border)] px-2 py-0.5 text-xs font-mono">
                      {c.path}
                    </span>
                    <span className="text-[var(--secondary-foreground)] font-mono text-xs">ID: {c._id.slice(0,6)}...</span>
                  </div>
                </div>
                
                <Link 
                  href={`/dashboard/${projectId}/${c._id}`}
                  className="mt-4 sm:mt-0 button-primary flex-shrink-0"
                >
                  OPEN_EDITOR
                </Link>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
