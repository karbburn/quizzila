"use client";

import React from "react";
import { Trophy, Timer, BrainCircuit, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { sessionService } from "@/services/sessionService";
import type { Question, QuizStatus } from "@/data/session";

interface QuizQuestionProps {
  currentQuestionData: Question | null;
  stepNumber: number;
  timeLeft: number;
  quizStatus: QuizStatus;
  selectedOption: string | null;
  submissionLatency: number | null;
  onOptionClick: (option: string) => void;
}

export function QuizQuestion({
  currentQuestionData,
  stepNumber,
  timeLeft,
  quizStatus,
  selectedOption,
  submissionLatency,
  onOptionClick,
}: QuizQuestionProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center bg-card backdrop-blur-md p-6 rounded-3xl border border-border shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 p-2 opacity-30">
          <span className="text-[8px] font-bold tracking-widest uppercase text-blue-400">
            Live Sync
          </span>
        </div>
        <div className="absolute top-0 right-0 p-2">
          <span
            className={cn(
              "text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border",
              quizStatus === "question_locked"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}
          >
            {quizStatus === "question_locked" ? "Locked" : "Active"}
          </span>
        </div>
        <div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
          style={{ width: `${(timeLeft / 30) * 100}%` }}
        />
        <div>
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">
            Phase
          </span>
          <p className="text-lg font-black tracking-tight">
            Question {stepNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!selectedOption && (
            <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-2 rounded-2xl border border-yellow-500/20 animate-in fade-in zoom-in duration-300">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-black text-yellow-500">
                +{sessionService.calculateFFFPoints(timeLeft)} pts
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 bg-muted/40 px-4 py-2 rounded-2xl border border-border">
            <Timer
              className={cn(
                "w-5 h-5",
                timeLeft < 7 ? "text-red-500 animate-pulse" : "text-blue-400"
              )}
            />
            <span className="text-xl font-black tabular-nums">
              {timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </span>
          </div>
        </div>
      </header>
      <div className="bg-card backdrop-blur-xl border border-border p-10 rounded-[2.5rem] shadow-2xl space-y-8 relative overflow-hidden">
        <h2 className="text-2xl font-bold leading-tight">
          {currentQuestionData?.text || "Loading question..."}
        </h2>

        {quizStatus === "question_locked" && !selectedOption && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
            <div className="text-center space-y-3">
              <Lock className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
              <h3 className="text-2xl font-black uppercase text-white tracking-tight">
                Time&apos;s Up!
              </h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                Submissions have been locked
              </p>
            </div>
          </div>
        )}

        {selectedOption ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl animate-pulse" />
              <BrainCircuit className="w-20 h-20 text-blue-400 relative animate-spin-slow" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter">
                Answer Submitted
              </h3>
              <div className="flex flex-col items-center gap-1">
                <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">
                  Waiting for other teams...
                </p>
                {submissionLatency !== null && (
                  <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    Reached server in {submissionLatency}ms
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {(currentQuestionData?.options || []).map(
              (option: string, i: number) => {
                const letter = ["A", "B", "C", "D"][i];
                return (
                  <button
                    key={i}
                    onClick={() => onOptionClick(option)}
                    className="group relative flex items-center justify-between p-5 rounded-2xl border border-white/10 hover:border-yellow-500/50 hover:bg-white/5 bg-white/2 transition-all duration-300 text-left hover:pl-8 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-black text-slate-500 group-hover:text-yellow-500 transition-colors">
                        {letter}
                      </span>
                      <span className="font-semibold">{option}</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-yellow-500 transition-all group-hover:scale-150" />
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}
