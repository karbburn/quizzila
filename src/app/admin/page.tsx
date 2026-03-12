"use client";

import React, { useState, useEffect } from "react";
import { type QuizState } from "@/data/session";
import { initialQuestions } from "@/data/questions";
import { Play, SkipForward, RotateCcw, Users, Activity, ShieldAlert, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { sessionService } from "@/services/sessionService";

export default function AdminDashboard() {
    const [quizState, setQuizState] = useState<QuizState | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchState = async () => {
            const data = await sessionService.getQuizState();
            if (data) setQuizState(data);
            setLoading(false);
        };

        fetchState();

        const subscription = sessionService.subscribeToState((newState) => {
            setQuizState(newState);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Countdown logic for auto-transition
    useEffect(() => {
        if (quizState?.status === 'countdown' && !loading) {
            const timer = setTimeout(() => {
                sessionService.startQuestion(0);
            }, 5500); // 5.5s to give some buffer
            return () => clearTimeout(timer);
        }
    }, [quizState?.status, loading]);

    const handleStartQuiz = () => {
        sessionService.startCountdown();
    };

    const handleNextQuestion = () => {
        if (!quizState) return;
        const nextIdx = quizState.current_question + 1;
        if (nextIdx < initialQuestions.length) {
            sessionService.startQuestion(nextIdx);
        } else {
            sessionService.endQuiz();
        }
    };

    const handleShowLeaderboard = () => {
        sessionService.showLeaderboard();
    };

    const handleReset = () => {
        if (confirm("This will clear ALL teams and answers. Are you sure?")) {
            sessionService.resetQuiz();
        }
    };

    if (loading) return null;

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
                                quizState?.status === 'question_active' ? "bg-emerald-500" : "bg-yellow-500"
                            )} />
                            <p className="text-2xl font-black tracking-tight uppercase whitespace-nowrap">
                                {quizState?.status.replace('_', ' ')}
                            </p>
                        </div>
                    </div>
                    <div className="bg-card p-6 rounded-3xl border border-border space-y-2">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Question PROGRESS</p>
                        <p className="text-4xl font-black">
                            {quizState?.current_question !== undefined ? quizState.current_question + 1 : 0}
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
                        {quizState?.status === 'waiting' && (
                            <button
                                onClick={handleStartQuiz}
                                className="group relative flex items-center justify-center gap-3 py-6 bg-blue-600 hover:bg-blue-500 rounded-3xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 col-span-1 md:col-span-2"
                            >
                                <Play className="w-6 h-6 fill-current" />
                                <span className="text-2xl font-black tracking-tight">ENGAGE QUIZ</span>
                            </button>
                        )}

                        {quizState?.status === 'question_active' && (
                            <>
                                <button
                                    onClick={handleShowLeaderboard}
                                    className="group relative flex items-center justify-center gap-3 py-6 bg-yellow-600 hover:bg-yellow-500 rounded-3xl transition-all shadow-xl active:scale-95"
                                >
                                    <Trophy className="w-6 h-6" />
                                    <span className="text-2xl font-black tracking-tight uppercase">Show Leaderboard</span>
                                </button>
                                <button
                                    onClick={handleNextQuestion}
                                    className="group relative flex items-center justify-center gap-3 py-6 bg-emerald-600 hover:bg-emerald-500 rounded-3xl transition-all shadow-xl active:scale-95"
                                >
                                    <SkipForward className="w-6 h-6 fill-current" />
                                    <span className="text-2xl font-black tracking-tight uppercase">Next Question</span>
                                </button>
                            </>
                        )}

                        {quizState?.status === 'leaderboard' && (
                            <button
                                onClick={handleNextQuestion}
                                className="group relative flex items-center justify-center gap-3 py-6 bg-emerald-600 hover:bg-emerald-500 rounded-3xl transition-all shadow-xl active:scale-95 col-span-1 md:col-span-2"
                            >
                                <SkipForward className="w-6 h-6 fill-current" />
                                <span className="text-2xl font-black tracking-tight uppercase">Push Next Question</span>
                            </button>
                        )}

                        {quizState?.status === 'finished' && (
                            <button
                                disabled
                                className="group relative flex items-center justify-center gap-3 py-6 bg-slate-800 text-slate-500 cursor-not-allowed rounded-3xl transition-all col-span-1 md:col-span-2"
                            >
                                <span className="text-2xl font-black tracking-tight uppercase">Quiz Concluded</span>
                            </button>
                        )}

                        <button
                            onClick={handleReset}
                            className="flex items-center justify-center gap-3 py-6 bg-muted/20 hover:bg-muted/30 border border-border rounded-3xl transition-all active:scale-95 col-span-1 md:col-span-2 mt-4"
                        >
                            <RotateCcw className="w-5 h-5 text-slate-500" />
                            <span className="text-xl font-bold text-slate-300">Reset Full Session</span>
                        </button>
                    </div>
                </div>

                {/* Question Preview */}
                <div className="bg-muted/10 p-8 rounded-3xl border border-border opacity-60 pointer-events-none">
                    <p className="text-[10px] uppercase font-black text-slate-500 mb-4 tracking-widest">Live Content Preview</p>
                    {quizState && initialQuestions[quizState.current_question] ? (
                        <div className="space-y-2">
                            <p className="text-lg font-bold">{initialQuestions[quizState.current_question].question}</p>
                            <p className="text-emerald-400 font-mono text-xs">Correct Answer: {initialQuestions[quizState.current_question].answer}</p>
                        </div>
                    ) : (
                        <p className="italic text-slate-500">Waiting for active phase...</p>
                    )}
                </div>
            </div>
        </div>
    );
}
