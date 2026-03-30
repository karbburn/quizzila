"use client";

import React from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/data/session";

interface QuizLeaderboardProps {
  leaderboard: LeaderboardEntry[];
}

export function QuizLeaderboard({ leaderboard }: QuizLeaderboardProps) {
  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      <header className="bg-card backdrop-blur-md p-6 rounded-3xl border border-border shadow-xl text-center">
        <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3 animate-bounce" />
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-yellow-500 mb-1">
          Current Standings
        </h2>
        <p className="text-white text-2xl font-black uppercase tracking-widest">
          Top Teams
        </p>
      </header>

      <div className="bg-card backdrop-blur-xl border border-border p-8 rounded-[2.5rem] shadow-2xl space-y-4">
        {leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              Compiling Scores...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((team, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                  idx === 0
                    ? "bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)]"
                    : idx === 1
                      ? "bg-slate-300/10 border-slate-300/20"
                      : idx === 2
                        ? "bg-amber-700/10 border-amber-700/30"
                        : "bg-white/5 border-white/5"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-inner",
                    idx === 0
                      ? "bg-yellow-500 text-black"
                      : idx === 1
                        ? "bg-slate-300 text-black"
                        : idx === 2
                          ? "bg-amber-600 text-black"
                          : "bg-slate-800 text-slate-400"
                  )}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 truncate">
                  <h3
                    className={cn(
                      "font-bold truncate text-lg",
                      idx === 0 ? "text-yellow-500" : "text-white"
                    )}
                  >
                    {team.team_name}
                  </h3>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "font-black text-xl tabular-nums",
                      idx === 0 ? "text-yellow-500" : "text-white"
                    )}
                  >
                    {team.score}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold ml-1">
                    pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
