"use client";

import React from "react";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-card border border-slate-600 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4 shadow-2xl">
        <h3 className="text-lg font-black uppercase tracking-tight">Are You Sure?</h3>
        <p className="text-slate-400 text-sm">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95">
            Confirm
          </button>
          <button onClick={onCancel} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
