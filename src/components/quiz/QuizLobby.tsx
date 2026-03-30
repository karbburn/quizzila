"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import type { TeamInfo } from "@/data/session";

interface QuizLobbyProps {
  team: TeamInfo | null;
  teamCount: number;
}

export function QuizLobby({ team, teamCount }: QuizLobbyProps) {
  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center space-y-16">
        <div className="flex flex-col items-center gap-4 mb-2">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-yellow-500/20 shadow-xl">
            <img
              src="/tqm_logo.jpg"
              alt="TQM Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black tracking-tighter uppercase text-yellow-500 leading-none">
              Starting Soon
            </h1>
            <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <p className="text-blue-400 font-bold uppercase tracking-widest text-[8px]">
                Team: {team?.name || "Loading..."}
              </p>
            </div>
          </div>
        </div>
        <div className="relative py-12">
          <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full" />
          <div className="relative space-y-2">
            <span className="text-[120px] font-black tracking-tighter leading-none bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
              {teamCount}
            </span>
            <p className="text-xl font-bold tracking-widest uppercase text-slate-500">
              Teams Ready
            </p>
          </div>
        </div>
        <div className="flex justify-center flex-col items-center gap-8">
          <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
              Synchronized
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
