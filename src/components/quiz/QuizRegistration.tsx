"use client";

import React from "react";
import { Trophy, BrainCircuit, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeTeamName, sanitizeMemberName } from "@/lib/sanitize";
import type { RegData, RegErrors, QuizStatus } from "@/data/session";

interface QuizRegistrationProps {
  showWelcome: boolean;
  regData: RegData;
  regErrors: RegErrors;
  nameTaken: boolean;
  isRegistering: boolean;
  quizStatus: QuizStatus;
  onSubmit: (e: React.FormEvent) => void;
  onSetRegData: (data: RegData) => void;
  onSetRegErrors: (errors: RegErrors) => void;
}

export function QuizRegistration({
  showWelcome,
  regData,
  regErrors,
  nameTaken,
  isRegistering,
  quizStatus,
  onSubmit,
  onSetRegData,
  onSetRegErrors,
}: QuizRegistrationProps) {
  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      {showWelcome ? (
        <div className="bg-card/50 backdrop-blur-xl border border-border p-12 rounded-[3.5rem] shadow-2xl text-center space-y-6 animate-in zoom-in duration-500">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full" />
            <div className="relative p-6 bg-white rounded-3xl shadow-2xl overflow-hidden border border-yellow-500/10">
              <Trophy className="w-16 h-16 text-yellow-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Welcome
            </h3>
            <p className="text-xl font-bold text-yellow-500 uppercase tracking-widest">
              {regData.teamName}{" "}
            </p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="bg-card/50 backdrop-blur-xl border border-border p-8 rounded-[2rem] space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-2 flex items-center justify-center overflow-hidden border border-yellow-500/20 shadow-lg">
              <img
                src="/tqm_logo.jpg"
                alt="TQM Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-yellow-500 uppercase">
              Team Join
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Quiz Entry
            </p>
          </div>

          {quizStatus !== "waiting" ? (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
              <h4 className="text-red-400 font-black uppercase tracking-tight">
                Access Locked
              </h4>
              <p className="text-xs text-red-500/80 font-medium">
                Quiz has already started. New teams cannot join.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-wider">
                      Team Name
                    </label>
                    <span
                      className={cn(
                        "text-[9px] font-bold",
                        regData.teamName.length > 25
                          ? "text-red-500"
                          : "text-slate-500"
                      )}
                    >
                      {regData.teamName.length}/25
                    </span>
                  </div>
                  <input
                    required
                    maxLength={30}
                    className={cn(
                      "w-full bg-background border px-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all font-bold text-sm",
                      nameTaken ||
                        regErrors.teamName ||
                        regData.teamName.length > 25
                        ? "border-red-500/50"
                        : "border-border"
                    )}
                    placeholder="Coolest Team Ever"
                    value={regData.teamName}
                    onChange={(e) => {
                      const value = sanitizeTeamName(e.target.value);
                      onSetRegData({ ...regData, teamName: value });
                      if (regErrors.teamName)
                        onSetRegErrors({ ...regErrors, teamName: undefined });
                    }}
                  />
                  {(nameTaken || regErrors.teamName) && (
                    <p className="text-[10px] text-red-400 font-bold mt-1 ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                      <ShieldAlert className="w-3 h-3" />{" "}
                      {regErrors.teamName || "Team name already taken"}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider ml-1">
                    Member 1 (Lead)
                  </label>
                  <input
                    required
                    className={cn(
                      "w-full bg-background border px-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all text-sm",
                      regErrors.member1 ? "border-red-500/50" : "border-border"
                    )}
                    placeholder="Your Name"
                    value={regData.member1}
                    onChange={(e) => {
                      const value = sanitizeMemberName(e.target.value);
                      onSetRegData({ ...regData, member1: value });
                      if (regErrors.member1)
                        onSetRegErrors({ ...regErrors, member1: undefined });
                    }}
                  />
                  {regErrors.member1 && (
                    <p className="text-[10px] text-red-400 font-bold mt-1 ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                      <ShieldAlert className="w-3 h-3" /> {regErrors.member1}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-wider ml-1 text-slate-500/60 flex items-center gap-2">
                    <span className="h-px bg-border/50 flex-1" />
                    Other Members (Optional)
                    <span className="h-px bg-border/50 flex-1" />
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      className="bg-background border border-border px-3 py-2 rounded-lg text-xs"
                      placeholder="Member 2"
                      value={regData.member2}
                      onChange={(e) =>
                        onSetRegData({
                          ...regData,
                          member2: sanitizeMemberName(e.target.value),
                        })
                      }
                    />
                    <input
                      className="bg-background border border-border px-3 py-2 rounded-lg text-xs"
                      placeholder="Member 3"
                      value={regData.member3}
                      onChange={(e) =>
                        onSetRegData({
                          ...regData,
                          member3: sanitizeMemberName(e.target.value),
                        })
                      }
                    />
                    <input
                      className="bg-background border border-border px-3 py-2 rounded-lg text-xs"
                      placeholder="Member 4"
                      value={regData.member4}
                      onChange={(e) =>
                        onSetRegData({
                          ...regData,
                          member4: sanitizeMemberName(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  isRegistering ||
                  nameTaken ||
                  !regData.teamName ||
                  !regData.member1 ||
                  regData.teamName.length > 25
                }
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-yellow-500/10 active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
              >
                {isRegistering ? (
                  <span className="flex items-center justify-center gap-2">
                    <BrainCircuit className="w-5 h-5 animate-spin-slow" />
                    Joining...
                  </span>
                ) : (
                  "Join Quiz"
                )}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
