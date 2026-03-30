"use client";

import React from "react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { ShieldAlert } from "lucide-react";
import type { TeamInfo } from "@/data/session";

interface QuizEntryProps {
  team: TeamInfo | null;
  showAdminLogin: boolean;
  adminCreds: { username: string; password: string };
  adminError: string;
  onAdminLogin: () => void;
  onSetShowAdminLogin: (show: boolean) => void;
  onSetAdminCreds: (creds: { username: string; password: string }) => void;
  onStartQuiz: () => void;
}

export function QuizEntry({
  team,
  showAdminLogin,
  adminCreds,
  adminError,
  onAdminLogin,
  onSetShowAdminLogin,
  onSetAdminCreds,
  onStartQuiz,
}: QuizEntryProps) {
  return (
    <div className="text-center space-y-10 animate-in fade-in zoom-in duration-700">
      <button
        onClick={() => onSetShowAdminLogin(true)}
        className="fixed top-8 left-8 z-[100] px-4 py-2 bg-card/80 backdrop-blur-md border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:border-yellow-500/50 transition-all flex items-center gap-2"
      >
        <ShieldAlert className="w-3.5 h-3.5" /> Admin Login
      </button>

      {showAdminLogin && (
        <div
          className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => onSetShowAdminLogin(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1">
              <ShieldAlert className="w-8 h-8 text-yellow-500 mx-auto" />
              <h3 className="text-xl font-black uppercase tracking-tight">
                Admin Access
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                Authorized Personnel Only
              </p>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Username"
                value={adminCreds.username}
                onChange={(e) =>
                  onSetAdminCreds({ ...adminCreds, username: e.target.value })
                }
                className="w-full bg-background border border-border px-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all text-sm"
              />
              <input
                type="password"
                placeholder="Password"
                value={adminCreds.password}
                onChange={(e) =>
                  onSetAdminCreds({ ...adminCreds, password: e.target.value })
                }
                onKeyDown={(e) => e.key === "Enter" && onAdminLogin()}
                className="w-full bg-background border border-border px-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all text-sm"
              />
            </div>
            {adminError && (
              <p className="text-red-400 text-xs font-bold text-center">
                {adminError}
              </p>
            )}
            <button
              onClick={onAdminLogin}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
            >
              Login
            </button>
          </div>
        </div>
      )}
      <div className="space-y-4">
        <div className="inline-block p-1 bg-white rounded-3xl mb-4 border border-yellow-500/20 overflow-hidden shadow-2xl">
          <img src="/tqm_logo.jpg" alt="Logo" className="w-24 h-24 object-contain" />
        </div>
        <h2 className="text-8xl font-black tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
          Quizzila
        </h2>
        <p className="text-slate-500 font-medium tracking-wide uppercase text-xs">
          The Ultimate TQM Platform
        </p>
      </div>
      <div className="flex justify-center pt-8">
        <InteractiveHoverButton
          text="Start Quiz"
          onClick={onStartQuiz}
          className="w-56 h-14 text-xl"
        />
      </div>
    </div>
  );
}
