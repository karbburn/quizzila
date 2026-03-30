"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { sanitizeQuestionText, sanitizeOptionText } from "@/lib/sanitize";

interface AddQuestionModalProps {
  editingQ: string | null;
  newQ: { text: string; options: string[]; correct_option: string; order_index: number };
  newQErrors: { text?: string; options?: (string | undefined)[] };
  onSave: () => void;
  onCancel: () => void;
  onSetNewQ: (q: { text: string; options: string[]; correct_option: string; order_index: number }) => void;
  onSetNewQErrors: (errors: { text?: string; options?: (string | undefined)[] }) => void;
}

export function AddQuestionModal({
  editingQ,
  newQ,
  newQErrors,
  onSave,
  onCancel,
  onSetNewQ,
  onSetNewQErrors,
}: AddQuestionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-card border border-slate-600 rounded-xl p-6 max-w-lg w-full mx-4 space-y-4 shadow-2xl">
        <h3 className="text-lg font-black uppercase tracking-tight">
          {editingQ ? 'Edit' : 'Add'} Question
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Question Text
            </label>
            <input
              value={newQ.text}
              onChange={e => {
                onSetNewQ({ ...newQ, text: sanitizeQuestionText(e.target.value) });
                if (newQErrors.text) onSetNewQErrors({ ...newQErrors, text: undefined });
              }}
              className="w-full bg-background border border-slate-600 px-3 py-2 rounded-lg mt-1 focus:border-blue-500 outline-none"
            />
            {newQErrors.text && (
              <p className="text-[10px] text-red-400 font-bold mt-1">{newQErrors.text}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['A', 'B', 'C', 'D'].map((opt, i) => (
              <div key={opt}>
                <label className="text-[10px] uppercase font-bold text-slate-500">
                  Option {opt}
                </label>
                <input
                  value={newQ.options[i]}
                  onChange={e => {
                    const o = [...newQ.options];
                    o[i] = sanitizeOptionText(e.target.value);
                    onSetNewQ({ ...newQ, options: o });
                    if (newQErrors.options) {
                      const newOpts = [...newQErrors.options];
                      newOpts[i] = undefined;
                      onSetNewQErrors({ ...newQErrors, options: newOpts });
                    }
                  }}
                  className="w-full bg-background border border-slate-600 px-3 py-2 rounded-lg mt-1 focus:border-blue-500 outline-none"
                />
                {newQErrors.options?.[i] && (
                  <p className="text-[9px] text-red-400 font-bold mt-1">{newQErrors.options[i]}</p>
                )}
              </div>
            ))}
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Correct Option
            </label>
            <div className="flex gap-2 mt-1">
              {['A', 'B', 'C', 'D'].map(opt => (
                <button
                  key={opt}
                  onClick={(e) => {
                    e.preventDefault();
                    onSetNewQ({ ...newQ, correct_option: opt });
                  }}
                  className={cn(
                    "w-12 py-2 rounded-lg font-bold transition-all",
                    newQ.correct_option === opt
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onSave}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded-lg transition-all active:scale-95"
          >
            {editingQ ? 'Update' : 'Save'} Question
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold uppercase rounded-lg transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
