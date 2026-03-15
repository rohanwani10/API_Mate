"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { PlusSquare, Terminal, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

export default function DashboardIndex() {
  const projects = useQuery(api.contracts.getProjects);
  const createProject = useMutation(api.contracts.createProject);
  const deleteProject = useMutation(api.contracts.deleteProject);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<{ id: any, name: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    try {
      await createProject({ name: newProjectName });
      setNewProjectName("");
    } finally {
      setIsCreating(false);
    }
  };

  const openDeleteModal = (e: React.MouseEvent, id: any, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(projectToDelete.id);
    try {
      await deleteProject({ projectId: projectToDelete.id });
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(null);
      setProjectToDelete(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-12">
      {/* Custom Alert Box */}
      <ConfirmModal 
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="PROTECTED_ACTION_REQUIRED"
        message={`WARNING: You are about to initiate a terminal wipe of project [${projectToDelete?.name}].\n\nThis will permanently delete all associated contracts, mock versions, and historical data. This operation is irreversible.`}
        confirmText="INITIATE_DELETE"
        cancelText="ABORT_MISSION"
        destructive={true}
      />

      <div className="flex items-end justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-4xl text-white flex items-center gap-3">
            <Terminal className="w-8 h-8 text-[var(--primary)]" />
            Projects
          </h1>
          <p className="font-mono text-[var(--secondary-foreground)] text-sm mt-2">
            SELECT_WORKSPACE * FROM USER_PROJECTS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create New Project Card */}
        <div className="panel p-6 border-dashed border-2 hover:border-[var(--primary)] transition-colors group">
          <form onSubmit={handleCreate} className="h-full flex flex-col justify-center">
             <h3 className="text-lg text-white mb-4 opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <PlusSquare className="w-5 h-5 text-[var(--primary)]" />
                Initialize New
             </h3>
             <input 
               type="text" 
               className="bg-black/50 border border-[var(--border)] p-3 text-white font-mono text-sm mb-4 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_10px_rgba(0,255,204,0.2)]"
               placeholder="Project_Name..."
               value={newProjectName}
               onChange={(e) => setNewProjectName(e.target.value)}
             />
             <button 
               type="submit" 
               disabled={isCreating}
               className="button-primary text-xs"
             >
               {isCreating ? "Deploying..." : "Create Project"}
             </button>
          </form>
        </div>

        {/* List Existing Projects */}
        {projects === undefined ? (
           <div className="panel p-6 flex items-center justify-center animate-pulse">
             <span className="font-mono text-[var(--primary)]">LOADING_DATA...</span>
           </div>
        ) : projects.length === 0 ? (
           <div className="panel p-6 col-span-1 md:col-span-2 flex items-center justify-center">
             <span className="font-mono text-[var(--secondary-foreground)]">NO_RECORDS_FOUND</span>
           </div>
        ) : (
          projects.map(p => (
            <Link href={`/dashboard/${p._id}`} key={p._id} className="panel p-6 flex flex-col group hover:border-[var(--primary)] transition-colors cursor-pointer block relative overflow-hidden">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl text-white group-hover:text-[var(--primary)] transition-colors">{p.name}</h3>
                  <button 
                    onClick={(e) => openDeleteModal(e, p._id, p.name)}
                    disabled={isDeleting === p._id}
                    className="p-1 text-[var(--border)] hover:text-red-500 transition-colors z-10"
                    title="Delete Project"
                  >
                    <Trash2 className={`w-4 h-4 ${isDeleting === p._id ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <p className="font-mono text-[var(--secondary-foreground)] text-xs">ID: {p._id.slice(0, 8)}...</p>
              </div>
              <div className="mt-8 flex justify-end">
                <span className="text-[var(--primary)] font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  ACCESS &gt;&gt;
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
