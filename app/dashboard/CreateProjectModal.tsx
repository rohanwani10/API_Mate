"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateProjectModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createProject = useMutation(api.contracts.createProject);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsCreating(true);
    try {
      await createProject({ name });
      setName("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 40 }}
      >
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div 
            style={{ 
              width: 52, 
              height: 52, 
              borderRadius: 14, 
              background: "var(--accent-light)",
              color: "var(--accent)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              marginBottom: 20
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <h2 style={{ fontSize: "1.6rem", marginBottom: 8, letterSpacing: "-0.02em" }}>Create New Project</h2>
          <p style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
            A project acts as a container for your JSON schemas and generated mock endpoints.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 32 }}>
            <label 
              htmlFor="projectName" 
              style={{ 
                display: "block", 
                fontSize: "0.9rem", 
                fontWeight: 600, 
                color: "var(--text-primary)", 
                marginBottom: 8 
              }}
            >
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              autoFocus
              className="input-field"
              placeholder="e.g. Acme Dashboard API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ padding: "12px 16px", fontSize: "1rem" }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button 
              type="button" 
              onClick={onClose}
              className="button-secondary"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="button-primary"
              disabled={isCreating || !name.trim()}
              style={{ opacity: (!name.trim() || isCreating) ? 0.6 : 1 }}
            >
              {isCreating ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
