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
  confirmText = "CONFIRM",
  cancelText = "CANCEL",
  destructive = true,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="panel relative w-full max-w-md border-2 border-[var(--border)] overflow-hidden animate-fade-in shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        {/* Top Accent Bar */}
        <div className={`absolute top-0 left-0 w-full h-1 ${destructive ? 'bg-[#ff0055]' : 'bg-[var(--primary)]'}`} />
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-6 h-6 ${destructive ? 'text-[#ff0055]' : 'text-[var(--primary)]'}`} />
              <h2 className="text-xl text-white font-display tracking-wider uppercase">{title}</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-[var(--secondary-foreground)] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-8">
            <p className="text-[var(--secondary-foreground)] font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
          </div>
          
          <div className="flex gap-4 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 font-mono text-xs text-[var(--secondary-foreground)] hover:text-white border border-[var(--border)] hover:border-[var(--secondary-foreground)] transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-6 py-2 font-mono text-xs font-bold transition-all ${
                destructive 
                  ? 'bg-transparent text-[#ff0055] border border-[#ff0055] hover:bg-[#ff0055] hover:text-black hover:shadow-[0_0_15px_rgba(255,0,85,0.4)]' 
                  : 'bg-transparent text-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary)] hover:text-black hover:shadow-[0_0_15px_rgba(0,255,204,0.4)]'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
        
        {/* Bottom Status Decoration */}
        <div className="px-6 py-2 bg-white/5 border-t border-[var(--border)] flex justify-between">
          <span className="text-[10px] font-mono text-[var(--secondary-foreground)] uppercase tracking-tighter">
            SECURITY_LEVEL: HIGH
          </span>
          <span className="text-[10px] font-mono text-[var(--secondary-foreground)] uppercase tracking-tighter">
            STATUS: AWAITING_INPUT
          </span>
        </div>
      </div>
    </div>
  );
}
