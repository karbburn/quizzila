"use client";

import React, { useState, useEffect } from "react";
import { type GameSession } from "@/data/session";
import { initialQuestions } from "@/data/questions";
import { Play, SkipForward, RotateCcw, Users, Activity, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { sessionService } from "@/services/sessionService";

export default function AdminDashboard() {
    const [session, setSession] = useState<GameSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            const data = await sessionService.getSession();
            if (data) setSession(data);
            setLoading(false);
        };

        fetchSession();

        const subscription = sessionService.subscribeToUpdates((newSession) => {
            setSession(newSession);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Countdown logic for auto-transition
    useEffect(() => {
        if (session?.status === 'COUNTDOWN') {
            const timer = setTimeout(() => {
                sessionService.startQuestion(0);
            }, 5500); // 5.5s to give some buffer
            return () => clearTimeout(timer);
        }
    }, [session?.status]);

    const handleStartQuiz = () => {
        sessionService.startCountdown();
    };

    const handleNextQuestion = () => {
        if (!session) return;
        const nextIdx = session.current_question_index + 1;
        if (nextIdx < initialQuestions.length) {
            sessionService.startQuestion(nextIdx);
        } else {
            sessionService.updateSession({ status: 'FINISHED' });
        }
    };

    const handleReset = () => {
        sessionService.resetSession();
    };


    return (
        <div className="min-h-screen bg-background text-foreground p-8 font-sans transition-colors duration-500">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-border pb-6">
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-yellow-500">QUIZZILA ADMIN</h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Auditorium Command Center</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <ToggleTheme />
                        <div className="bg-muted/30 border border-border px-4 py-2 rounded-xl flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-xl font-black">120+</span>
                        </div>
                        <div className="bg-muted/30 border border-border px-4 py-2 rounded-xl flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-tighter text-foreground">Live Sync</span>
                        </div>
                    </div>
                </div>

                {/* Current State Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-card p-6 rounded-3xl border border-border space-y-2">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Active Status</p>
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-3 h-3 rounded-full animate-pulse",
                                session?.status === 'QUESTION' ? "bg-emerald-500" : "bg-yellow-500"
                            )} />
                            <p className="text-2xl font-black tracking-tight uppercase">{session?.status}</p>
                        </div>
                    </div>
                    <div className="bg-card p-6 rounded-3xl border border-border space-y-2">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Current Index</p>
                        <p className="text-4xl font-black">
                            {session?.current_question_index !== undefined ? session.current_question_index + 1 : 0}
                            <span className="text-lg text-slate-600 font-normal"> / {initialQuestions.length}</span>
                        </p>
                    </div>
                    <div className="bg-card p-6 rounded-3xl border border-border space-y-2">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Server Time</p>
                        <p className="text-2xl font-black tabular-nums">{new Date().toLocaleTimeString()}</p>
                    </div>
                </div>

                {/* Primary Controls */}
                <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-2xl space-y-8">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-yellow-500" />
                        Mission Controls
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {session?.status === 'LOBBY' ? (
                            <button
                                onClick={handleStartQuiz}
                                className="group relative flex items-center justify-center gap-3 py-6 bg-blue-600 hover:bg-blue-500 rounded-3xl transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                            >
                                <Play className="w-6 h-6 fill-current" />
                                <span className="text-2xl font-black tracking-tight">ENGAGE QUIZ</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleNextQuestion}
                                disabled={session?.status === 'FINISHED'}
                                className="group relative flex items-center justify-center gap-3 py-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:bg-slate-800 rounded-3xl transition-all shadow-xl active:scale-95"
                            >
                                <SkipForward className="w-6 h-6 fill-current" />
                                <span className="text-2xl font-black tracking-tight uppercase">
                                    {session?.status === 'FINISHED' ? 'CONCLUDED' : 'Push Next Phase'}
                                </span>
                            </button>
                        )}

                        <button
                            onClick={handleReset}
                            className="flex items-center justify-center gap-3 py-6 bg-muted/20 hover:bg-muted/30 border border-border rounded-3xl transition-all active:scale-95"
                        >
                            <RotateCcw className="w-5 h-5 text-slate-500" />
                            <span className="text-xl font-bold text-slate-300">Reset Session</span>
                        </button>
                    </div>
                </div>

                {/* Question Preview */}
                <div className="bg-muted/10 p-8 rounded-3xl border border-border opacity-60 pointer-events-none">
                    <p className="text-[10px] uppercase font-black text-slate-500 mb-4 tracking-widest">Live Content Preview</p>
                    {session && initialQuestions[session.current_question_index] ? (
                        <div className="space-y-2">
                            <p className="text-lg font-bold">{initialQuestions[session.current_question_index].question}</p>
                            <p className="text-emerald-400 font-mono text-xs">Correct Answer: {initialQuestions[session.current_question_index].answer}</p>
                        </div>
                    ) : (
                        <p className="italic text-slate-500">Waiting for active phase...</p>
                    )}
                </div>
            </div>
        </div>
    );
}
