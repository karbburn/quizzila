"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Question, AnswerStats } from "@/data/session";

interface QuizRevealProps {
  currentQuestionData: Question;
  currentQue: number;
  selectedOptionFeedback: "correct" | "incorrect" | null;
  selectedOption: string | null;
  answerStats: AnswerStats | null;
}

export function QuizReveal({
  currentQuestionData,
  currentQue,
  selectedOptionFeedback,
  selectedOption,
  answerStats,
}: QuizRevealProps) {
  const correctIndex = ["A", "B", "C", "D"].indexOf(
    currentQuestionData?.correct_option || "A"
  );

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      <header className="bg-card backdrop-blur-md p-6 rounded-3xl border border-border shadow-xl text-center">
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-orange-400 mb-1">
          Answer Reveal
        </h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
          Question {currentQue + 1}
        </p>
      </header>

      <div className="bg-card backdrop-blur-xl border border-border p-10 rounded-[2.5rem] shadow-2xl space-y-8 text-center bg-gradient-to-b from-card to-card/50">
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Correct Answer
          </p>
          <div className="inline-block px-8 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <p className="text-3xl font-black text-emerald-400 uppercase italic tracking-tighter">
              {currentQuestionData?.correct_option}:{" "}
              {currentQuestionData?.options?.[correctIndex]}
            </p>
          </div>
        </div>

        <div className="h-px bg-border/50 w-2/3 mx-auto" />

        <div className="space-y-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Your Result
          </p>
          {selectedOptionFeedback === "correct" ? (
            <div className="space-y-3 animate-bounce">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <Check className="w-12 h-12 text-emerald-500" />
              </div>
              <p className="text-3xl font-black text-white uppercase italic">
                Correct!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                <X className="w-12 h-12 text-red-500" />
              </div>
              <p className="text-3xl font-black text-slate-300 uppercase italic">
                Incorrect
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                You selected: {selectedOption || "No Answer"}
              </p>
            </div>
          )}
        </div>

        {/* Stats Visualization */}
        {answerStats && (
          <div className="pt-8 space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              Live Distribution
            </p>
            <div className="grid grid-cols-4 gap-3 items-end h-24">
              {(["A", "B", "C", "D"] as const).map((opt) => {
                const count = answerStats[opt];
                const height =
                  answerStats.total > 0
                    ? (count / answerStats.total) * 100
                    : 0;
                const isCorrect =
                  currentQuestionData?.correct_option === opt;
                return (
                  <div
                    key={opt}
                    className="space-y-2 flex flex-col items-center group"
                  >
                    <div className="text-[9px] font-black text-slate-400 group-hover:text-white transition-colors">
                      {count}
                    </div>
                    <div
                      className="w-full bg-slate-800 rounded-t-lg relative overflow-hidden transition-all duration-1000"
                      style={{ height: `${Math.max(height, 8)}%` }}
                    >
                      <div
                        className={cn(
                          "absolute inset-0",
                          isCorrect ? "bg-emerald-500" : "bg-blue-500/40"
                        )}
                      />
                    </div>
                    <div
                      className={cn(
                        "text-xs font-black p-1 rounded-md w-full",
                        isCorrect
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "text-slate-500"
                      )}
                    >
                      {opt}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
