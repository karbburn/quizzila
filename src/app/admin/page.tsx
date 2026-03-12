"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { type GameSession } from "@/data/session";
import { initialQuestions } from "@/data/questions";
import { Play, SkipForward, RotateCcw, Users, Activity, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
    const [session, setSession] = useState<GameSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            const { data, error } = await supabase
                .from('game_sessions')
                .select('*')
                .single();

            if (data && !error) setSession(data as GameSession);
            setLoading(false);
        };

        fetchSession();

        const channel = supabase
            .channel('admin-sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions' }, (payload) => {
                setSession(payload.new as GameSession);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const updateSession = async (updates: Partial<GameSession>) => {
        const { error } = await supabase
            .from('game_sessions')
            .update(updates)
            .eq('id', 'active-session');

        if (error) console.error("Update failed:", error);
    };

    const handleStartQuiz = () => {
        updateSession({
            status: 'QUESTION',
            current_question_index: 0,
            timer_start: new Date().toISOString()
        });
    };

    const handleNextQuestion = () => {
        if (!session) return;
        const nextIdx = session.current_question_index + 1;
        if (nextIdx < initialQuestions.length) {
            updateSession({
                current_question_index: nextIdx,
                status: 'QUESTION',
                timer_start: new Date().toISOString()
            });
        } else {
            updateSession({ status: 'FINISHED' });
        }
    };

    const handleReset = () => {
        updateSession({
            status: 'LOBBY',
            current_question_index: 0,
            timer_start: null
        });
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Initializing Admin Link...</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-end border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-yellow-500">QUIZZILA ADMIN</h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Auditorium Command Center</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-xl font-black">120+</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-tighter">Live Sync</span>
                        </div>
                    </div>
                </div>

                {/* Current State Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Active Status</p>
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-3 h-3 rounded-full animate-pulse",
                                session?.status === 'QUESTION' ? "bg-emerald-500" : "bg-yellow-500"
                            )} />
                            <p className="text-2xl font-black tracking-tight uppercase">{session?.status}</p>
                        </div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Current Index</p>
                        <p className="text-4xl font-black">
                            {session?.current_question_index !== undefined ? session.current_question_index + 1 : 0}
                            <span className="text-lg text-slate-600 font-normal"> / {initialQuestions.length}</span>
                        </p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Server Time</p>
                        <p className="text-2xl font-black tabular-nums">{new Date().toLocaleTimeString()}</p>
                    </div>
                </div>

                {/* Primary Controls */}
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-8">
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
                            className="flex items-center justify-center gap-3 py-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition-all active:scale-95"
                        >
                            <RotateCcw className="w-5 h-5 text-slate-500" />
                            <span className="text-xl font-bold text-slate-300">Reset Session</span>
                        </button>
                    </div>
                </div>

                {/* Question Preview */}
                <div className="bg-white/2 p-8 rounded-3xl border border-white/5 opacity-60 pointer-events-none">
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
