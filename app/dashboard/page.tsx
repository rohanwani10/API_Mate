"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import CreateProjectModal from "./CreateProjectModal";

export default function DashboardIndex() {
  const projects = useQuery(api.contracts.getProjects);
  const deleteProject = useMutation(api.contracts.deleteProject);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<{ id: any, name: string } | null>(null);

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
    <div className="animate-fade-in" style={{ paddingBottom: 60 }}>
      {/* Create Modal */}
      <CreateProjectModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
      />

      {/* Delete Confirmation */}
      <ConfirmModal 
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? All mock data and endpoints will be permanently removed.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        destructive={true}
      />

      {/* Header */}
      <div 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          marginBottom: 40,
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: 8, letterSpacing: "-0.03em" }}>
            Projects
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            Manage your mock API schemas and endpoints.
          </p>
        </div>
        
        <button 
          className="button-primary"
          onClick={() => setIsCreateOpen(true)}
          style={{ padding: "10px 20px" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
          gap: 24 
        }}
      >
        {projects === undefined ? (
          // Loading states
          [1, 2, 3].map((n) => (
            <div 
              key={n}
              className="panel" 
              style={{ 
                height: 140, 
                padding: 24, 
                display: "flex", 
                flexDirection: "column", 
                justifyContent: "space-between" 
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: "60%", height: 20, background: "var(--border)", borderRadius: 4, animation: "shimmer 2s infinite" }} />
                <div style={{ width: 24, height: 24, background: "var(--border)", borderRadius: 12, animation: "shimmer 2s infinite" }} />
              </div>
              <div style={{ width: "40%", height: 12, background: "var(--border)", borderRadius: 4, animation: "shimmer 2s infinite" }} />
            </div>
          ))
        ) : projects.length === 0 ? (
          <div 
            style={{ 
              gridColumn: "1 / -1", 
              padding: "60px 20px",
              textAlign: "center",
              background: "var(--bg-elevated)",
              border: "1px dashed var(--border-strong)",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div 
              style={{ 
                width: 56, 
                height: 56, 
                borderRadius: 16, 
                background: "var(--bg-base)", 
                border: "1px solid var(--border)",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                marginBottom: 20,
                color: "var(--text-tertiary)"
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: 8, color: "var(--text-primary)" }}>No Projects Yet</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: 24, maxWidth: 360 }}>
              Create your first project to start generating dynamic mock APIs from JSON schemas.
            </p>
            <button 
              className="button-primary"
              onClick={() => setIsCreateOpen(true)}
            >
              Create First Project
            </button>
          </div>
        ) : (
          /* Project Cards */
          projects.map(p => (
            <Link 
              href={`/dashboard/${p._id}`} 
              key={p._id} 
              className="panel"
              style={{
                display: "block",
                padding: 24,
                textDecoration: "none",
                transition: "all 0.2s cubic-bezier(0.34, 1.2, 0.64, 1)",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-md)";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent-glow)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-sm)";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Folder Icon */}
                  <div 
                    style={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: 10, 
                      background: "var(--accent-light)", 
                      color: "var(--accent)",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center" 
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"/>
                      <line x1="8" y1="12" x2="21" y2="12"/>
                      <line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/>
                      <line x1="3" y1="12" x2="3.01" y2="12"/>
                      <line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
                    {p.name}
                  </h3>
                </div>

                <button 
                  onClick={(e) => openDeleteModal(e, p._id, p.name)}
                  disabled={isDeleting === p._id}
                  style={{
                    padding: 6,
                    background: "transparent",
                    border: "none",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                    zIndex: 2,
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#ff3b30";
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,59,48,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                  title="Delete Project"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  ID: {p._id.slice(0, 8)}
                </span>
                <span 
                  style={{ 
                    fontSize: "0.85rem", 
                    color: "var(--accent)", 
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  Open 
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
