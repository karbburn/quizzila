"use client";

import React, { useState, useEffect, useCallback } from "react";
import { type QuizState, type Team, type Answer } from "@/data/session";
import {
    Play, SkipForward, RotateCcw, Users, Activity, ShieldAlert, Trophy, Timer,
    Plus, Trash2, PenLine, Pause, PlayCircle, Clock, BarChart3, ListOrdered,
    Settings, Zap, Upload, CheckCircle2, AlertCircle, Eye, Lock, Unlock,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { sessionService } from "@/services/sessionService";
import { supabase } from "@/lib/supabase";

type AdminTab = "control" | "questions" | "settings";

export default function AdminDashboard() {
    const [quizState, setQuizState] = useState<QuizState | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AdminTab>("control");

    // Live Control
    const [teamCount, setTeamCount] = useState(0);
    const [teams, setTeams] = useState<{ name: string; score: number; answers: number }[]>([]);
    const [allTeams, setAllTeams] = useState<{ team_name: string; member1: string; created_at: string }[]>([]);
    const [answerStats, setAnswerStats] = useState<{ A: number; B: number; C: number; D: number; total: number }>({ A: 0, B: 0, C: 0, D: 0, total: 0 });
    const [questions, setQuestions] = useState<any[]>([]);
    const [answersLocked, setAnswersLocked] = useState(false);

    // Timer
    const [timerDuration, setTimerDuration] = useState(30);
    const [customTimer, setCustomTimer] = useState("");
    const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);
    const [liveTimer, setLiveTimer] = useState(0);

    // Questions Manager
    const [importText, setImportText] = useState("");
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [editingQ, setEditingQ] = useState<any | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newQ, setNewQ] = useState({ text: "", options: ["", "", "", ""], correct_option: "A", order_index: 0 });
    const [showInlineAdd, setShowInlineAdd] = useState(false);
    const [inlineQ, setInlineQ] = useState({ text: "", options: ["", "", "", ""], correct_option: "A" });
    const [savingAll, setSavingAll] = useState(false);

    // Confirmation dialog
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

    const loadQuestions = useCallback(async () => {
        const q = await sessionService.getQuestions();
        setQuestions(q);
    }, []);

    const loadTeams = useCallback(async () => {
        // Top 10 for Realtime Leaderboard preview
        const { data: topData } = await supabase.from('teams').select('id, team_name, score').order('score', { ascending: false }).limit(10);
        if (topData) {
            const teamsWithAnswers = await Promise.all(topData.map(async (t: any) => {
                const { count } = await supabase.from('answers').select('*', { count: 'exact', head: true }).eq('team_id', t.id);
                return { name: t.team_name, score: t.score, answers: count ?? 0 };
            }));
            setTeams(teamsWithAnswers);
        }

        // All teams for Teams Joined Monitor
        const { data: allData } = await supabase.from('teams').select('team_name, member1, created_at').order('created_at', { ascending: true });
        if (allData) setAllTeams(allData);
    }, []);

    // ── Init ──
    useEffect(() => {
        const init = async () => {
            const state = await sessionService.getQuizState();
            if (state) setQuizState(state);
            const count = await sessionService.getTeamCount();
            setTeamCount(count);
            await loadQuestions();
            await loadTeams();
            setLoading(false);
        };
        init();

        const stateSub = sessionService.subscribeToState((s) => setQuizState(s));
        const teamSub = sessionService.subscribeToTeams(() => {
            setTeamCount(prev => prev + 1);
            loadTeams();
        });
        const answerSub = sessionService.subscribeToAnswers(async () => {
            // Re-fetch stats to get accurate data
            if (quizState?.status === 'question_active' && questions.length > 0) {
                const q = questions[quizState.current_question];
                if (q) {
                    const stats = await sessionService.getAnswerStats(q.id);
                    setAnswerStats(stats);

                    // Automatic locking when all teams have answered
                    // We check if stats.total >= teamCount (teamCount is fetched in init/teamSub)
                    // Added a delay or refetch of teamCount might be safer but this is reactive
                    if (stats.total > 0 && teamCount > 0 && stats.total >= teamCount) {
                        sessionService.lockAnswers();
                    }
                }
            }
        });

        return () => { stateSub.unsubscribe(); teamSub.unsubscribe(); answerSub.unsubscribe(); };
    }, [loadQuestions, loadTeams]);

    // ── Refresh stats on question change ──
    useEffect(() => {
        if (quizState?.status === 'question_active' && questions.length > 0) {
            const q = questions[quizState.current_question];
            if (q) sessionService.getAnswerStats(q.id).then(setAnswerStats);
            setAnswersLocked(false);
        }
    }, [quizState?.current_question, quizState?.status, questions]);

    // ── Refresh leaderboard when status changes ──
    useEffect(() => {
        if (quizState?.status === 'leaderboard' || quizState?.status === 'finished') loadTeams();
    }, [quizState?.status, loadTeams]);

    // ── Live Timer ──
    useEffect(() => {
        if (!quizState?.timer_end) { setLiveTimer(0); return; }
        const tick = () => {
            const diff = Math.max(0, Math.floor((new Date(quizState.timer_end!).getTime() - Date.now()) / 1000));
            setLiveTimer(diff);
        };
        tick();
        const interval = setInterval(tick, 500);
        return () => clearInterval(interval);
    }, [quizState?.timer_end]);

    // ── Countdown auto-advance ──
    useEffect(() => {
        if (quizState?.status === 'countdown' && !loading) {
            const timeDiff = quizState.timer_end ? Math.max(50, new Date(quizState.timer_end).getTime() - Date.now() + 200) : 3200;
            const t = setTimeout(() => sessionService.activateQuestion(), timeDiff);
            return () => clearTimeout(t);
        }
    }, [quizState?.status, quizState?.timer_end, loading]);

    // ── Handlers ──
    const handleStartQuiz = () => sessionService.startCountdown(0, 1, 3);
    const handleNextQuestion = () => {
        if (!quizState) return;
        const next = quizState.current_question + 1;
        const nextStep = (quizState.step_number || 1) + 1;
        next < questions.length ? sessionService.startCountdown(next, nextStep, 3) : sessionService.endQuiz();
    };
    const handleShowLeaderboard = async () => { await sessionService.showLeaderboard(); await loadTeams(); };
    const handleRevealAnswer = async () => {
        await sessionService.revealAnswer();
        setAnswersLocked(true);
    };
    const handleSkip = () => handleNextQuestion();
    const handleLockAnswers = () => sessionService.lockAnswers();
    const handleEndQuiz = () => {
        setConfirmAction({
            message: "This will END the quiz for all participants.",
            onConfirm: () => { sessionService.endQuiz(); setConfirmAction(null); }
        });
    };
    const handleReset = () => {
        setConfirmAction({
            message: "This will remove all teams and answers.",
            onConfirm: () => {
                sessionService.resetQuiz();
                setTeamCount(0); setTeams([]); setAllTeams([]); setAnswerStats({ A: 0, B: 0, C: 0, D: 0, total: 0 });
                setConfirmAction(null);
            }
        });
    };

    const handleBulkImport = async () => {
        try {
            const parsed = JSON.parse(importText);
            if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");
            await sessionService.bulkImportQuestions(parsed);
            setImportStatus({ type: 'success', message: `Imported ${parsed.length} questions!` });
            setImportText("");
            await loadQuestions();
            setTimeout(() => setImportStatus(null), 3000);
        } catch (err: any) {
            setImportStatus({ type: 'error', message: err.message || "Invalid JSON" });
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        setConfirmAction({
            message: "Delete this question permanently?",
            onConfirm: async () => { await sessionService.deleteQuestion(id); await loadQuestions(); setConfirmAction(null); }
        });
    };

    const handleSaveQuestion = async () => {
        try {
            if (editingQ) {
                await sessionService.updateQuestion(editingQ, newQ);
            } else {
                await sessionService.addQuestion({ ...newQ, order_index: questions.length });
            }
            await loadQuestions();
            setShowAddModal(false);
            setNewQ({ text: "", options: ["", "", "", ""], correct_option: "A", order_index: 0 });
            setEditingQ(null);
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full" /></div>;

    const currentQ = questions[quizState?.current_question ?? 0];
    const progressPct = questions.length > 0 ? (((quizState?.current_question ?? 0) + 1) / questions.length) * 100 : 0;

    const statusColor: Record<string, string> = {
        waiting: "bg-yellow-500",
        countdown: "bg-blue-500",
        question_active: "bg-emerald-500",
        question_locked: "bg-red-500",
        answer_reveal: "bg-orange-500",
        leaderboard: "bg-purple-500",
        finished: "bg-gray-500"
    };

    return (
        <div className="min-h-screen bg-background text-slate-200 font-sans text-sm">
            {/* ── Confirmation Dialog ── */}
            {confirmAction && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-card border border-slate-600 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4 shadow-2xl">
                        <h3 className="text-lg font-black uppercase tracking-tight">Are You Sure?</h3>
                        <p className="text-slate-400 text-sm">{confirmAction.message}</p>
                        <div className="flex gap-3">
                            <button onClick={confirmAction.onConfirm} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95">Confirm</button>
                            <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add Question Modal ── */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-card border border-slate-600 rounded-xl p-6 max-w-lg w-full mx-4 space-y-4 shadow-2xl">
                        <h3 className="text-lg font-black uppercase tracking-tight">{editingQ ? 'Edit' : 'Add'} Question</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Question Text</label>
                                <input value={newQ.text} onChange={e => setNewQ({ ...newQ, text: e.target.value })} className="w-full bg-background border border-slate-600 px-3 py-2 rounded-lg mt-1 focus:border-blue-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {['A', 'B', 'C', 'D'].map((opt, i) => (
                                    <div key={opt}>
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Option {opt}</label>
                                        <input value={newQ.options[i]} onChange={e => { const o = [...newQ.options]; o[i] = e.target.value; setNewQ({ ...newQ, options: o }); }} className="w-full bg-background border border-slate-600 px-3 py-2 rounded-lg mt-1 focus:border-blue-500 outline-none" />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Correct Option</label>
                                <div className="flex gap-2 mt-1">
                                    {['A', 'B', 'C', 'D'].map(opt => (
                                        <button key={opt} onClick={(e) => { e.preventDefault(); setNewQ({ ...newQ, correct_option: opt }); }} className={cn("w-12 py-2 rounded-lg font-bold transition-all", newQ.correct_option === opt ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600")}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Points A-D</label>
                                <input type="number" defaultValue={100} className="w-full bg-background border border-slate-600 px-3 py-2 rounded-lg mt-1 focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleSaveQuestion} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded-lg transition-all active:scale-95">{editingQ ? 'Update' : 'Save'} Question</button>
                            <button onClick={() => { setShowAddModal(false); setEditingQ(null); }} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold uppercase rounded-lg transition-all active:scale-95">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto p-4 space-y-4">
                {/* ── Tab Navigation ── */}
                <div className="flex items-center gap-1 border-b border-slate-700 pb-0">
                    {([
                        { id: "control" as AdminTab, label: "Live Quiz Control" },
                        { id: "questions" as AdminTab, label: "Question Manager" },
                        { id: "settings" as AdminTab, label: "Settings / Timer Control" },
                    ]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-5 py-2.5 font-bold text-xs uppercase tracking-wider transition-all rounded-t-lg border border-b-0",
                                activeTab === tab.id
                                    ? "bg-card text-white border-slate-600"
                                    : "bg-transparent text-slate-500 border-transparent hover:text-slate-300"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                        <ToggleTheme />
                    </div>
                </div>

                {/* ══════════════════════════════════════════════ */}
                {/* TAB 1: LIVE QUIZ CONTROL                     */}
                {/* ══════════════════════════════════════════════ */}
                {activeTab === "control" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* ── Status Header Bar ── */}
                        <div className="bg-card border border-slate-700 rounded-lg p-3 flex items-center gap-4 flex-wrap">
                            <span className="font-bold text-slate-300">Live Event Quiz</span>
                            <span className="text-slate-500">|</span>
                            <span className="text-slate-400">Question <span className="font-black text-white">{quizState?.step_number ?? 1}</span> / {questions.length}</span>
                            <span className="text-slate-500">|</span>
                            {/* Progress Bar */}
                            <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                                <span className="text-slate-500 text-xs">Progress</span>
                                <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                                </div>
                            </div>
                            <span className="text-slate-500">|</span>
                            <span className="text-slate-400">Timer: <span className={cn("font-black", liveTimer < 7 ? "text-red-400" : "text-white")}>{liveTimer}s</span></span>
                            <span className="text-slate-500">|</span>
                            <span className="text-slate-400">Status: <span className={cn("inline-block w-2.5 h-2.5 rounded-full ml-1", statusColor[quizState?.status ?? 'waiting'])} /> <span className="font-bold text-white ml-1 capitalize">{quizState?.status?.replace('_', ' ')}</span></span>
                        </div>

                        {/* ── Control Buttons Row ── */}
                        <div className="flex flex-wrap gap-3">
                            <button onClick={handleStartQuiz} disabled={quizState?.status !== 'waiting'} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-600 rounded-lg font-bold uppercase text-xs tracking-wider transition-all active:scale-95 flex items-center gap-2">
                                <Play className="w-4 h-4" /> Start Quiz
                            </button>
                            <button onClick={handleNextQuestion} disabled={quizState?.status === 'waiting' || quizState?.status === 'finished'} className="px-8 py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed border border-emerald-600 rounded-lg font-bold uppercase text-xs tracking-wider transition-all active:scale-95 flex items-center gap-2 text-emerald-100">
                                <ChevronRight className="w-5 h-5" /> Next Question
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={handleShowLeaderboard} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95">Show Leaderboard</button>
                            <button onClick={handleRevealAnswer} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95">Reveal Answer</button>
                            <button onClick={handleSkip} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95">Skip Question</button>
                            <button
                                onClick={handleLockAnswers}
                                disabled={quizState?.status !== 'question_active'}
                                className="px-4 py-2.5 bg-red-900/40 hover:bg-red-900/60 disabled:opacity-30 disabled:cursor-not-allowed border border-red-500/30 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center gap-1.5 text-red-100"
                            >
                                <Lock className="w-3 h-3" /> Lock Answers
                            </button>
                            {/* Status Indicators */}
                            <div className="ml-auto flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
                                <span className="flex items-center gap-1.5 text-[10px]"><span className={cn("w-2 h-2 rounded-full", quizState?.status === 'waiting' ? "bg-yellow-500" : "bg-slate-600")} /> Waiting</span>
                                <span className="flex items-center gap-1.5 text-[10px]"><span className={cn("w-2 h-2 rounded-full", quizState?.status === 'question_active' ? "bg-emerald-500" : "bg-slate-600")} /> Active</span>
                                <span className="flex items-center gap-1.5 text-[10px]"><span className={cn("w-2 h-2 rounded-full", quizState?.status === 'question_locked' ? "bg-red-500" : "bg-slate-600")} /> Locked</span>
                                <span className="flex items-center gap-1.5 text-[10px]"><span className={cn("w-2 h-2 rounded-full", quizState?.status === 'answer_reveal' ? "bg-orange-500" : "bg-slate-600")} /> Reveal</span>
                                <span className="flex items-center gap-1.5 text-[10px]"><span className={cn("w-2 h-2 rounded-full", quizState?.status === 'leaderboard' ? "bg-purple-500" : "bg-slate-600")} /> Leaderboard</span>
                                <span className="flex items-center gap-1.5 text-[10px]"><span className={cn("w-2 h-2 rounded-full", quizState?.status === 'finished' ? "bg-gray-500" : "bg-slate-600")} /> Finished</span>
                            </div>
                        </div>

                        {/* ── Main Content Grid ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Question Panel + Correct Answer */}
                            <div className="space-y-4">
                                {/* Question Panel */}
                                <div className="bg-card border border-slate-700 rounded-lg p-5 space-y-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question {quizState?.step_number ?? 1}:</p>
                                    <p className="text-lg font-bold leading-snug">{currentQ?.text || "No active question"}</p>
                                    {currentQ && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {(currentQ.options || []).map((opt: string, i: number) => {
                                                const letter = ['A', 'B', 'C', 'D'][i];
                                                const isCorrect = currentQ.correct_option === letter;
                                                return (
                                                    <div key={i} className={cn("flex items-center gap-2 py-2", isCorrect && answersLocked ? "text-emerald-400" : "text-slate-300")}>
                                                        <span className="font-black text-lg">{letter}</span>
                                                        <span className="font-medium">{opt}</span>
                                                        {isCorrect && answersLocked && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Correct Answer Display */}
                                <div className="bg-card border border-slate-700 rounded-lg p-5 space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question Display Panel</p>
                                    {currentQ ? (
                                        <div>
                                            <p className="text-slate-400 font-bold">Correct Answer:</p>
                                            <p className="text-xl font-black text-white">
                                                Option {currentQ.correct_option}, {currentQ.options?.[['A', 'B', 'C', 'D'].indexOf(currentQ.correct_option)] ?? ''}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 italic">Waiting for question...</p>
                                    )}
                                </div>
                            </div>

                            {/* Right: Live Stats + Leaderboard */}
                            <div className="space-y-4">
                                {/* Answer Progress Tracker */}
                                <div className="bg-card border border-slate-700 rounded-lg p-5 space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Answer Tracker</p>
                                            <p className="text-xl font-black text-white tabular-nums">
                                                {answerStats.total} <span className="text-slate-500 text-sm font-bold">/ {teamCount}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</p>
                                            <p className={cn(
                                                "text-xs font-black uppercase",
                                                answerStats.total >= teamCount ? "text-emerald-400" : "text-yellow-500"
                                            )}>
                                                {answerStats.total >= teamCount ? "All Answered" : "Awaiting Answers"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative h-6 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 p-1">
                                        <div className="absolute inset-y-1 left-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-md transition-all duration-1000 flex items-center justify-center overflow-hidden"
                                            style={{ width: `calc(${teamCount > 0 ? (answerStats.total / teamCount) * 100 : 0}% - 8px)` }}>
                                            {(answerStats.total / (teamCount || 1)) > 0.1 && (
                                                <span className="text-[8px] font-black text-white uppercase whitespace-nowrap">
                                                    {'█'.repeat(Math.ceil((answerStats.total / (teamCount || 1)) * 20))}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center italic">
                                        {quizState?.status === 'question_locked' ? "Submissions Locked" : "Real-time subscription active"}
                                    </p>
                                </div>

                                {/* Live Response Statistics */}
                                <div className="bg-card border border-slate-700 rounded-lg p-5 space-y-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Response Statistics</p>
                                    {['A', 'B', 'C', 'D'].map(opt => {
                                        const count = answerStats[opt as 'A' | 'B' | 'C' | 'D'];
                                        const maxCount = Math.max(answerStats.A, answerStats.B, answerStats.C, answerStats.D, 1);
                                        const barWidth = (count / maxCount) * 100;
                                        return (
                                            <div key={opt} className="flex items-center gap-3">
                                                <span className="font-black w-4 text-slate-400">{opt}</span>
                                                <div className="flex-1 h-5 bg-slate-700/50 rounded overflow-hidden">
                                                    <div className="h-full bg-slate-500 rounded transition-all duration-300 flex items-center" style={{ width: `${Math.max(barWidth, 2)}%` }}>
                                                        {count > 0 && <span className="text-[9px] font-bold text-white px-1">{'█'.repeat(Math.min(count, 20))}</span>}
                                                    </div>
                                                </div>
                                                <span className="text-slate-400 font-bold tabular-nums w-8 text-right">— {count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ── Teams & Leaderboard Section ── */}
                        <hr className="border-slate-800 my-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Teams Joined Monitor */}
                            <div className="bg-card border border-slate-700 rounded-lg p-5 space-y-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teams Joined Monitor: <span className="text-white">{teamCount} Teams</span></p>
                                <div className="space-y-1 max-h-[350px] overflow-y-auto pr-2">
                                    {allTeams.length === 0 ? (
                                        <p className="text-slate-500 text-xs italic">No teams joined yet</p>
                                    ) : (
                                        allTeams.map((t, i) => (
                                            <div key={i} className="flex flex-col sm:flex-row justify-between sm:items-center py-2 border-b border-slate-700/50 last:border-0 gap-1">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-slate-200">{t.team_name}</span>
                                                    <span className="text-slate-500 text-[10px] uppercase tracking-wider">Leader: <span className="text-slate-400">{t.member1}</span></span>
                                                </div>
                                                <span className="text-slate-500 text-[10px] bg-slate-800/50 px-2 py-1 rounded inline-block w-max">
                                                    Joined {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Right: Realtime Leaderboard Preview */}
                            <div className="bg-card border border-slate-700 rounded-lg p-5 space-y-3 relative flex flex-col">
                                <div className="absolute top-4 right-5"><span className="text-[9px] uppercase tracking-widest text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded">Admin Only Preview</span></div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Realtime Leaderboard</p>
                                {teams.length === 0 ? (
                                    <p className="text-slate-500 text-xs italic">No scores yet</p>
                                ) : (
                                    <div className="space-y-1 max-h-[350px] overflow-y-auto pr-2 mt-2">
                                        {teams.map((t, i) => (
                                            <div key={i} className="flex items-center gap-3 py-2 text-sm border-b border-slate-700/50 last:border-0">
                                                <span className="text-slate-500 font-bold w-6 tabular-nums">{i + 1}.</span>
                                                <span className="font-bold flex-1 text-slate-200 truncate">{t.name} <span className="ml-2 text-[10px] text-slate-500 font-normal">({t.answers} answers)</span></span>
                                                <span className="font-black text-yellow-500 tabular-nums text-right">{t.score} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════ */}
                {/* TAB 2: QUESTION MANAGER                      */}
                {/* ══════════════════════════════════════════════ */}
                {activeTab === "questions" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Header */}
                        <div className="bg-card border border-slate-700 rounded-lg p-3 flex items-center gap-4 flex-wrap">
                            <span className="font-bold text-slate-300">Live Event Quiz</span>
                            <span className="text-slate-500">|</span>
                            <span className="text-slate-400">Question <span className="font-black text-white">{quizState?.step_number ?? 1}</span> / {questions.length}</span>
                            <span className="text-slate-500">|</span>
                            <span className="text-slate-400">Status: <span className="text-yellow-400 font-bold capitalize">{quizState?.status?.replace('_', ' ')}</span></span>
                            <span className="text-slate-500">|</span>
                            <span className="text-slate-400">Timer: <span className="font-bold text-white">{liveTimer}s</span></span>
                        </div>

                        <div className="flex gap-3 items-center">
                            <button onClick={() => setShowAddModal(true)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center gap-1.5">
                                <Plus className="w-3.5 h-3.5" /> Add Question
                            </button>
                            <button onClick={() => setShowInlineAdd(!showInlineAdd)} className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center gap-1.5 text-emerald-100">
                                <Plus className="w-3.5 h-3.5" /> Quick Add +
                            </button>
                            <button onClick={() => setImportText(importText ? "" : " ")} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center gap-1.5">
                                <Upload className="w-3.5 h-3.5" /> Bulk Import
                            </button>
                            <button onClick={async () => { setSavingAll(true); await loadQuestions(); setSavingAll(false); }} className="ml-auto px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center gap-1.5 text-black">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {savingAll ? 'Syncing...' : 'Save to Database'}
                            </button>
                        </div>

                        {/* Bulk Import */}
                        {importText !== "" && (
                            <div className="bg-card border border-blue-500/30 rounded-lg p-4 space-y-3 animate-in slide-in-from-top-2">
                                <p className="text-[10px] text-slate-500 font-medium">Paste JSON: <code className="text-blue-400">[{`{numb, question, answer, options[]}`}]</code></p>
                                <textarea value={importText.trim()} onChange={(e) => setImportText(e.target.value)} placeholder='[{"numb": 1, "question": "...", "answer": "...", "options": ["...", "..."]}]' className="w-full h-32 bg-background border border-slate-600 p-3 rounded-lg font-mono text-xs focus:border-blue-500 outline-none" />
                                <div className="flex items-center justify-between">
                                    {importStatus && (
                                        <div className={cn("flex items-center gap-2 text-xs font-bold", importStatus.type === 'success' ? "text-emerald-400" : "text-red-400")}>
                                            {importStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                            {importStatus.message}
                                        </div>
                                    )}
                                    <button onClick={handleBulkImport} className="ml-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-all active:scale-95">Import</button>
                                </div>
                            </div>
                        )}

                        {/* Question Table */}
                        <div className="bg-card border border-slate-700 rounded-lg overflow-hidden">
                            <div className="grid grid-cols-[40px_1fr_80px_60px_60px] gap-2 px-4 py-2 bg-slate-800/50 border-b border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>Q#</span>
                                <span>Short Question Preview</span>
                                <span className="text-center">Push Live</span>
                                <span className="text-center">Edit</span>
                                <span className="text-center">Delete</span>
                            </div>
                            {questions.length === 0 ? (
                                <p className="text-slate-500 text-xs italic py-8 text-center">No questions. Use Bulk Import or Add Question.</p>
                            ) : (
                                <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-700/50">
                                    {questions.map((q) => (
                                        <div key={q.id} className="grid grid-cols-[40px_1fr_80px_60px_60px] gap-2 px-4 py-2.5 hover:bg-slate-800/30 transition-colors items-center">
                                            <span className="text-xs font-bold text-slate-500 tabular-nums">{q.order_index + 1}.</span>
                                            <span className="text-xs truncate">{q.text}</span>
                                            <button onClick={() => sessionService.startCountdown(q.order_index, (quizState?.step_number || 0) + 1, 3)} className="text-center text-[10px] font-bold text-purple-400 hover:text-purple-300 uppercase transition-colors px-2 py-1 bg-purple-500/10 rounded">Push Live</button>
                                            <button onClick={() => {
                                                setNewQ({ text: q.text, options: q.options, correct_option: q.correct_option, order_index: q.order_index });
                                                setEditingQ(q.id);
                                                setShowAddModal(true);
                                            }} className="text-center text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase transition-colors">Edit</button>
                                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-center text-[10px] font-bold text-red-400 hover:text-red-300 uppercase transition-colors">Delete</button>
                                        </div>
                                    ))}
                                    {/* Inline Quick Add Row */}
                                    {showInlineAdd && (
                                        <div className="px-4 py-3 bg-emerald-900/10 border-t border-emerald-500/20 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                                                <input value={inlineQ.text} onChange={e => setInlineQ({ ...inlineQ, text: e.target.value })} placeholder="Type question text..." className="flex-1 bg-background border border-slate-600 px-3 py-2 rounded-lg text-xs focus:border-emerald-500 outline-none" />
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {['A', 'B', 'C', 'D'].map((opt, i) => (
                                                    <input key={opt} value={inlineQ.options[i]} onChange={e => { const o = [...inlineQ.options]; o[i] = e.target.value; setInlineQ({ ...inlineQ, options: o }); }} placeholder={`Option ${opt}`} className="bg-background border border-slate-600 px-3 py-2 rounded-lg text-xs focus:border-emerald-500 outline-none" />
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">Correct:</span>
                                                {['A', 'B', 'C', 'D'].map(opt => (
                                                    <button key={opt} onClick={() => setInlineQ({ ...inlineQ, correct_option: opt })} className={cn("w-8 py-1 rounded text-xs font-bold transition-all", inlineQ.correct_option === opt ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600")}>{opt}</button>
                                                ))}
                                                <button onClick={async () => {
                                                    if (!inlineQ.text.trim()) return;
                                                    await sessionService.addQuestion({ text: inlineQ.text, options: inlineQ.options, correct_option: inlineQ.correct_option, order_index: questions.length + 1 });
                                                    await loadQuestions();
                                                    setInlineQ({ text: '', options: ['', '', '', ''], correct_option: 'A' });
                                                }} className="ml-auto px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Save
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════ */}
                {/* TAB 3: SETTINGS / TIMER CONTROL               */}
                {/* ══════════════════════════════════════════════ */}
                {activeTab === "settings" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Default Timer */}
                        <div className="bg-card border border-slate-700 rounded-lg p-5 space-y-4">
                            <p className="text-sm font-bold text-slate-300">Default Question Timer</p>
                            <div className="flex gap-3">
                                {[15, 30, 45, 60].map(sec => (
                                    <button key={sec} onClick={() => setTimerDuration(sec)} className={cn("px-5 py-3 rounded-lg font-bold text-sm transition-all", timerDuration === sec ? "bg-slate-600 text-white border border-slate-500" : "bg-slate-700/50 text-slate-400 border border-slate-700 hover:bg-slate-700")}>
                                        {sec}s
                                    </button>
                                ))}
                                <div className="flex items-center gap-2">
                                    <input type="number" value={customTimer} onChange={e => setCustomTimer(e.target.value)} placeholder="Custom" className="w-20 bg-background border border-slate-600 px-3 py-2 rounded-lg text-center font-bold focus:border-blue-500 outline-none" />
                                    {customTimer && <button onClick={() => { setTimerDuration(parseInt(customTimer) || 30); setCustomTimer(""); }} className="px-3 py-2 bg-blue-600 rounded-lg text-xs font-bold">Set</button>}
                                </div>
                            </div>
                        </div>

                        {/* Live Timer Overrides */}
                        <div className="bg-card border border-slate-700 rounded-lg p-5 space-y-4">
                            <p className="text-sm font-bold text-slate-300">Live Timer Overrides</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => sessionService.extendTimer(10)} className="py-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-all active:scale-95 text-center">
                                    <p className="font-bold text-sm">Extend Timer</p>
                                    <p className="text-xs text-emerald-400">+10 seconds</p>
                                </button>
                                <button onClick={() => sessionService.extendTimer(-3)} className="py-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-all active:scale-95 text-center">
                                    <p className="font-bold text-sm">Reduce Timer</p>
                                    <p className="text-xs text-red-400">-3 seconds</p>
                                </button>
                                <button onClick={async () => { const r = await sessionService.pauseTimer(); setPausedRemaining(r); }} className="py-4 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 rounded-lg transition-all active:scale-95 font-bold text-sm text-red-400 flex items-center justify-center gap-2">
                                    <Pause className="w-4 h-4" /> Pause Timer
                                </button>
                                <button onClick={() => { if (pausedRemaining !== null) { sessionService.resumeTimer(pausedRemaining); setPausedRemaining(null); } }} disabled={pausedRemaining === null} className="py-4 bg-emerald-900/30 hover:bg-emerald-900/50 disabled:opacity-30 border border-emerald-500/30 rounded-lg transition-all active:scale-95 font-bold text-sm text-emerald-400 flex items-center justify-center gap-2">
                                    <PlayCircle className="w-4 h-4" /> Resume Timer
                                </button>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="bg-card border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                            <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-yellow-400/80 font-bold">WARNING: End Quiz &amp; Reset Session are high-stakes. Confirmation prompt required.</p>
                                <div className="flex gap-3 mt-3">
                                    <button onClick={handleEndQuiz} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-400 font-bold text-xs transition-all active:scale-95">End Quiz</button>
                                    <button onClick={handleReset} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-400 font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5">
                                        <RotateCcw className="w-3 h-3" /> Reset Session
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
