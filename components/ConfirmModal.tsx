"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = true,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Modal Content */}
      <div 
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 32, maxWidth: 420 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div 
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: destructive ? "rgba(255,59,48,0.08)" : "var(--accent-light)",
                color: destructive ? "#ff3b30" : "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle strokeWidth={2.5} size={24} />
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              {title}
            </h2>
          </div>
          <button 
            onClick={onClose}
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
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, margin: 0, paddingLeft: 64 }}>
            {message}
          </p>
        </div>
        
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            className="button-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="button-primary"
            style={destructive ? {
              background: "#ff3b30",
              boxShadow: "0 2px 8px rgba(255, 59, 48, 0.3)",
            } : undefined}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
