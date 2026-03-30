"use client";

import React from "react";

export function QuizFinished() {
  return (
    <div className="bg-card backdrop-blur-xl border border-border p-12 rounded-[3.5rem] shadow-2xl text-center space-y-8 animate-in zoom-in duration-500">
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
        <div className="relative p-7 bg-white rounded-3xl shadow-2xl overflow-hidden border border-yellow-500/20">
          <img
            src="/tqm_logo.jpg"
            alt="TQM Logo"
            className="w-24 h-24 object-contain"
          />
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-5xl font-black tracking-tight leading-none">
          THE END
        </h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          Auditorium Validation Complete
        </p>
      </div>
      <p className="text-slate-500 text-xs">
        Leaderboard will be projected on the main screen.
      </p>
    </div>
  );
}
