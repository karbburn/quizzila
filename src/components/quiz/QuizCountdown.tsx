"use client";

import React from "react";

interface QuizCountdownProps {
  stepNumber: number;
  timeLeft: number;
}

export function QuizCountdown({ stepNumber, timeLeft }: QuizCountdownProps) {
  return (
    <div className="text-center space-y-12 animate-in fade-in zoom-in duration-500">
      <div className="space-y-4">
        <p className="text-yellow-500 font-black uppercase tracking-[0.3em] text-sm animate-bounce">
          {stepNumber === 1 ? "Host started the quiz" : "Get Ready"}
        </p>
        <h2 className="text-2xl font-bold text-slate-400">
          {stepNumber === 1
            ? "Quiz will begin shortly"
            : `Question ${stepNumber} is about to appear!`}
        </h2>
      </div>
      <div className="relative flex items-center justify-center p-20">
        <div className="absolute inset-0 bg-yellow-500/10 blur-[100px] rounded-full animate-pulse" />
        <div
          key={timeLeft}
          className="text-[180px] font-black tracking-tighter leading-none bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent animate-count-pump"
        >
          {Math.max(1, Math.ceil(timeLeft / 6))}
        </div>
      </div>
    </div>
  );
}
