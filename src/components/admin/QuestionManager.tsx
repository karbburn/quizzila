"use client";

import React from "react";
import { Plus, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeQuestionText, sanitizeOptionText } from "@/lib/sanitize";
import type { QuizState, Question } from "@/data/session";

interface QuestionManagerProps {
  quizState: QuizState | null;
  questions: Question[];
  liveTimer: number;
  importText: string;
  importStatus: { type: 'success' | 'error'; message: string } | null;
  showInlineAdd: boolean;
  inlineQ: { text: string; options: string[]; correct_option: string };
  inlineQErrors: { text?: string; options?: (string | undefined)[] };
  savingAll: boolean;
  onSetShowAddModal: (show: boolean) => void;
  onSetShowInlineAdd: (show: boolean) => void;
  onSetImportText: (text: string) => void;
  onSetInlineQ: (q: { text: string; options: string[]; correct_option: string }) => void;
  onSetInlineQErrors: (errors: { text?: string; options?: (string | undefined)[] }) => void;
  onBulkImport: () => void;
  onDeleteQuestion: (id: string) => void;
  onEditQuestion: (q: Question) => void;
  onSaveInlineQuestion: () => void;
  onLoadQuestions: () => Promise<void>;
  onPushLive: (orderIndex: number, stepNumber: number) => void;
}

export function QuestionManager({
  quizState,
  questions,
  liveTimer,
  importText,
  importStatus,
  showInlineAdd,
  inlineQ,
  inlineQErrors,
  savingAll,
  onSetShowAddModal,
  onSetShowInlineAdd,
  onSetImportText,
  onSetInlineQ,
  onSetInlineQErrors,
  onBulkImport,
  onDeleteQuestion,
  onEditQuestion,
  onSaveInlineQuestion,
  onLoadQuestions,
  onPushLive,
}: QuestionManagerProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-card border border-slate-700 rounded-lg p-3 flex items-center gap-4 flex-wrap">
        <span className="font-bold text-slate-300">Live Event Quiz</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Question <span className="font-black text-white">{quizState?.step_number ?? 1}</span> / {questions.length}</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Status: <span className="text-yellow-400 font-bold capitalize">{quizState?.status?.replace('_', ' ')}</span></span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Timer: <span className="font-bold text-white">{liveTimer}s</span></span>
      </div>

      <div className="flex gap-3 items-center">
        <button onClick={() => onSetShowAddModal(true)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Question
        </button>
        <button onClick={() => onSetShowInlineAdd(!showInlineAdd)} className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center gap-1.5 text-emerald-100">
          <Plus className="w-3.5 h-3.5" /> Quick Add +
        </button>
        <button onClick={() => onSetImportText(importText ? "" : " ")} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Bulk Import
        </button>
        <button onClick={async () => { await onLoadQuestions(); }} className="ml-auto px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center gap-1.5 text-black">
          <CheckCircle2 className="w-3.5 h-3.5" /> {savingAll ? 'Syncing...' : 'Sync Questions'}
        </button>
      </div>

      {/* Bulk Import */}
      {importText !== "" && (
        <div className="bg-card border border-blue-500/30 rounded-lg p-4 space-y-3 animate-in slide-in-from-top-2">
          <p className="text-[10px] text-slate-500 font-medium">Paste JSON: <code className="text-blue-400">[{`{numb, question, answer, options[]}`}]</code></p>
          <textarea value={importText.trim()} onChange={(e) => onSetImportText(e.target.value)} placeholder='[{"numb": 1, "question": "...", "answer": "...", "options": ["...", "..."]}]' className="w-full h-32 bg-background border border-slate-600 p-3 rounded-lg font-mono text-xs focus:border-blue-500 outline-none" />
          <div className="flex items-center justify-between">
            {importStatus && (
              <div className={cn("flex items-center gap-2 text-xs font-bold", importStatus.type === 'success' ? "text-emerald-400" : "text-red-400")}>
                {importStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {importStatus.message}
              </div>
            )}
            <button onClick={onBulkImport} className="ml-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-all active:scale-95">Import</button>
          </div>
        </div>
      )}

      {/* Question Table */}
      <div className="bg-card border border-slate-700 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_80px_60px_60px] gap-2 px-4 py-2 bg-slate-800/50 border-b border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <span>Q#</span>
          <span>Short Question Preview</span>
          <span className="text-center">Push Live</span>
          <span className="text-center">Edit</span>
          <span className="text-center">Delete</span>
        </div>
        {questions.length === 0 ? (
          <p className="text-slate-500 text-xs italic py-8 text-center">No questions. Use Bulk Import or Add Question.</p>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-700/50">
            {questions.map((q) => (
              <div key={q.id} className="grid grid-cols-[40px_1fr_80px_60px_60px] gap-2 px-4 py-2.5 hover:bg-slate-800/30 transition-colors items-center">
                <span className="text-xs font-bold text-slate-500 tabular-nums">{q.order_index + 1}.</span>
                <span className="text-xs truncate">{q.text}</span>
                <button onClick={() => onPushLive(q.order_index, (quizState?.step_number || 0) + 1)} className="text-center text-[10px] font-bold text-purple-400 hover:text-purple-300 uppercase transition-colors px-2 py-1 bg-purple-500/10 rounded">Push Live</button>
                <button onClick={() => onEditQuestion(q)} className="text-center text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase transition-colors">Edit</button>
                <button onClick={() => onDeleteQuestion(q.id)} className="text-center text-[10px] font-bold text-red-400 hover:text-red-300 uppercase transition-colors">Delete</button>
              </div>
            ))}
            {/* Inline Quick Add Row */}
            {showInlineAdd && (
              <div className="px-4 py-3 bg-emerald-900/10 border-t border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input value={inlineQ.text} onChange={e => {
                    onSetInlineQ({ ...inlineQ, text: sanitizeQuestionText(e.target.value) });
                    if (inlineQErrors.text) onSetInlineQErrors({ ...inlineQErrors, text: undefined });
                  }} placeholder="Type question text..." className="flex-1 bg-background border border-slate-600 px-3 py-2 rounded-lg text-xs focus:border-emerald-500 outline-none" />
                </div>
                {inlineQErrors.text && <p className="text-[9px] text-red-400 font-bold">{inlineQErrors.text}</p>}
                {inlineQErrors.options?.some(o => o) && <p className="text-[9px] text-red-400 font-bold">Please fill all options</p>}
                <div className="grid grid-cols-4 gap-2">
                  {['A', 'B', 'C', 'D'].map((opt, i) => (
                    <input key={opt} value={inlineQ.options[i]} onChange={e => {
                      const o = [...inlineQ.options];
                      o[i] = sanitizeOptionText(e.target.value);
                      onSetInlineQ({ ...inlineQ, options: o });
                    }} placeholder={`Option ${opt}`} className="bg-background border border-slate-600 px-3 py-2 rounded-lg text-xs focus:border-emerald-500 outline-none" />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Correct:</span>
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <button key={opt} onClick={() => onSetInlineQ({ ...inlineQ, correct_option: opt })} className={cn("w-8 py-1 rounded text-xs font-bold transition-all", inlineQ.correct_option === opt ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600")}>{opt}</button>
                  ))}
                  <button onClick={onSaveInlineQuestion} className="ml-auto px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
