"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { type QuizState, type Question, type AnswerStats } from "@/data/session";
import { ShieldAlert, Pause, PlayCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { sessionService } from "@/services/sessionService";
import { supabase } from "@/lib/supabase";
import { sanitizeQuestionText, sanitizeOptionText, validateQuestionText, validateOptionText } from "@/lib/sanitize";
import { QuizControl, QuestionManager, ConfirmDialog, AddQuestionModal } from "@/components/admin";

type AdminTab = "control" | "questions" | "settings";

export default function AdminDashboard() {
    const [quizState, setQuizState] = useState<QuizState | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AdminTab>("control");

    // Live Control
    const [teamCount, setTeamCountState] = useState(0);
    const setTeamCount = useCallback((value: number | ((prev: number) => number)) => {
        if (typeof value === 'function') {
            setTeamCountState(prev => {
                const next = value(prev);
                teamCountRef.current = next;
                return next;
            });
        } else {
            setTeamCountState(value);
            teamCountRef.current = value;
        }
    }, []);
    const [teams, setTeams] = useState<{ name: string; score: number; answers: number }[]>([]);
    const [allTeams, setAllTeams] = useState<{ team_name: string; member1: string; created_at: string }[]>([]);
    const [answerStats, setAnswerStats] = useState<AnswerStats>({ A: 0, B: 0, C: 0, D: 0, total: 0 });
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answersLocked, setAnswersLocked] = useState(false);

    // Timer
    const [timerDuration, setTimerDuration] = useState(30);
    const [customTimer, setCustomTimer] = useState("");
    const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);
    const [liveTimer, setLiveTimer] = useState(0);

    // Questions Manager
    const [importText, setImportText] = useState("");
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [editingQ, setEditingQ] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newQ, setNewQ] = useState({ text: "", options: ["", "", "", ""], correct_option: "A", order_index: 0 });
    const [newQErrors, setNewQErrors] = useState<{ text?: string; options?: (string | undefined)[] }>({});
    const [showInlineAdd, setShowInlineAdd] = useState(false);
    const [inlineQ, setInlineQ] = useState({ text: "", options: ["", "", "", ""], correct_option: "A" });
    const [inlineQErrors, setInlineQErrors] = useState<{ text?: string; options?: (string | undefined)[] }>({});

    // Confirmation dialog
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

    // Ref for fresh team count to avoid stale closure in answer subscription
    const teamCountRef = useRef(0);

    const loadQuestions = useCallback(async () => {
        const q = await sessionService.getQuestions();
        setQuestions(q);
    }, []);

    const loadTeams = useCallback(async () => {
        const { data: topData } = await supabase.from('teams').select('id, team_name, score').order('score', { ascending: false }).limit(10);
        if (topData) {
            const teamsWithAnswers = await Promise.all(topData.map(async (t: any) => {
                const { count } = await supabase.from('answers').select('*', { count: 'exact', head: true }).eq('team_id', t.id);
                return { name: t.team_name, score: t.score, answers: count ?? 0 };
            }));
            setTeams(teamsWithAnswers);
        }

        const { data: allData } = await supabase.from('teams').select('team_name, member1, created_at').order('created_at', { ascending: true });
        if (allData) setAllTeams(allData);
    }, []);

    // Init
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
            if (quizState?.status === 'question_active' && questions.length > 0) {
                const q = questions[quizState.current_question];
                if (q) {
                    const stats = await sessionService.getAnswerStats(q.id);
                    setAnswerStats(stats);
                    if (stats.total > 0 && teamCountRef.current > 0 && stats.total >= teamCountRef.current) {
                        sessionService.lockAnswers();
                    }
                }
            }
        });

        return () => { stateSub.unsubscribe(); teamSub.unsubscribe(); answerSub.unsubscribe(); };
    }, [loadQuestions, loadTeams]);

    // Refresh stats on question change
    useEffect(() => {
        if (quizState?.status === 'question_active' && questions.length > 0) {
            const q = questions[quizState.current_question];
            if (q) sessionService.getAnswerStats(q.id).then(setAnswerStats);
            setAnswersLocked(false);
        }
    }, [quizState?.current_question, quizState?.status, questions]);

    // Refresh leaderboard when status changes
    useEffect(() => {
        if (quizState?.status === 'leaderboard' || quizState?.status === 'finished') loadTeams();
    }, [quizState?.status, loadTeams]);

    // Live Timer
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

    // Countdown auto-advance
    useEffect(() => {
        if (quizState?.status === 'countdown' && !loading) {
            const timeDiff = quizState.timer_end ? Math.max(50, new Date(quizState.timer_end).getTime() - Date.now() + 200) : 3200;
            const t = setTimeout(() => sessionService.activateQuestion(), timeDiff);
            return () => clearTimeout(t);
        }
    }, [quizState?.status, quizState?.timer_end, loading]);

    // Handlers
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

            const sanitized = parsed.map((q: any) => ({
                ...q,
                question: q.question ? sanitizeQuestionText(String(q.question)) : '',
                options: Array.isArray(q.options) ? q.options.map((o: any) => sanitizeOptionText(String(o))) : [],
            }));

            for (let i = 0; i < sanitized.length; i++) {
                const q = sanitized[i];
                if (!q.question) throw new Error(`Question ${i + 1}: text is required`);
                if (q.options.length < 2) throw new Error(`Question ${i + 1}: at least 2 options required`);
                for (let j = 0; j < q.options.length; j++) {
                    if (!q.options[j]) throw new Error(`Question ${i + 1}, Option ${j + 1}: text is required`);
                }
            }

            await sessionService.bulkImportQuestions(sanitized);
            setImportStatus({ type: 'success', message: `Imported ${sanitized.length} questions!` });
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

    const handleEditQuestion = (q: Question) => {
        setNewQ({ text: q.text, options: q.options, correct_option: q.correct_option, order_index: q.order_index });
        setEditingQ(q.id);
        setShowAddModal(true);
    };

    const handleSaveQuestion = async () => {
        const textError = validateQuestionText(newQ.text);
        const optionErrors: string[] = [];
        newQ.options.forEach((opt) => {
            const err = validateOptionText(opt);
            optionErrors.push(err || '');
        });

        if (textError || optionErrors.some(e => e !== '')) {
            setNewQErrors({
                text: textError || undefined,
                options: optionErrors.map(e => e === '' ? undefined : e),
            });
            return;
        }
        setNewQErrors({});

        try {
            const sanitizedData = {
                text: sanitizeQuestionText(newQ.text),
                options: newQ.options.map(opt => sanitizeOptionText(opt)),
                correct_option: newQ.correct_option,
                order_index: newQ.order_index,
            };

            if (editingQ) {
                await sessionService.updateQuestion(editingQ, sanitizedData);
            } else {
                await sessionService.addQuestion({ ...sanitizedData, order_index: questions.length });
            }
            await loadQuestions();
            setShowAddModal(false);
            setNewQ({ text: "", options: ["", "", "", ""], correct_option: "A", order_index: 0 });
            setEditingQ(null);
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleSaveInlineQuestion = async () => {
        if (!inlineQ.text.trim()) {
            setInlineQErrors({ text: 'Question text is required', options: [] });
            return;
        }
        const textErr = validateQuestionText(inlineQ.text);
        const optsErr = inlineQ.options.map(o => {
            const err = validateOptionText(o);
            return err === null ? undefined : err;
        });
        if (textErr || optsErr.some(e => e)) {
            setInlineQErrors({ text: textErr || undefined, options: optsErr });
            return;
        }
        setInlineQErrors({});
        await sessionService.addQuestion({
            text: sanitizeQuestionText(inlineQ.text),
            options: inlineQ.options.map(o => sanitizeOptionText(o)),
            correct_option: inlineQ.correct_option,
            order_index: questions.length + 1
        });
        await loadQuestions();
        setInlineQ({ text: '', options: ['', '', '', ''], correct_option: 'A' });
    };

    const handlePushLive = (orderIndex: number, stepNumber: number) => {
        sessionService.startCountdown(orderIndex, stepNumber, 3);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full" /></div>;

    return (
        <div className="min-h-screen bg-background text-slate-200 font-sans text-sm">
            {/* Confirmation Dialog */}
            {confirmAction && (
                <ConfirmDialog
                    message={confirmAction.message}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={() => setConfirmAction(null)}
                />
            )}

            {/* Add Question Modal */}
            {showAddModal && (
                <AddQuestionModal
                    editingQ={editingQ}
                    newQ={newQ}
                    newQErrors={newQErrors}
                    onSave={handleSaveQuestion}
                    onCancel={() => { setShowAddModal(false); setEditingQ(null); }}
                    onSetNewQ={setNewQ}
                    onSetNewQErrors={setNewQErrors}
                />
            )}

            <div className="max-w-6xl mx-auto p-4 space-y-4">
                {/* Tab Navigation */}
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

                {/* TAB 1: LIVE QUIZ CONTROL */}
                {activeTab === "control" && (
                    <QuizControl
                        quizState={quizState}
                        questions={questions}
                        answerStats={answerStats}
                        teamCount={teamCount}
                        allTeams={allTeams}
                        teams={teams}
                        liveTimer={liveTimer}
                        answersLocked={answersLocked}
                        onStartQuiz={handleStartQuiz}
                        onNextQuestion={handleNextQuestion}
                        onShowLeaderboard={handleShowLeaderboard}
                        onRevealAnswer={handleRevealAnswer}
                        onSkip={handleSkip}
                        onLockAnswers={handleLockAnswers}
                    />
                )}

                {/* TAB 2: QUESTION MANAGER */}
                {activeTab === "questions" && (
                    <QuestionManager
                        quizState={quizState}
                        questions={questions}
                        liveTimer={liveTimer}
                        importText={importText}
                        importStatus={importStatus}
                        showInlineAdd={showInlineAdd}
                        inlineQ={inlineQ}
                        inlineQErrors={inlineQErrors}
                        savingAll={false}
                        onSetShowAddModal={setShowAddModal}
                        onSetShowInlineAdd={setShowInlineAdd}
                        onSetImportText={setImportText}
                        onSetInlineQ={setInlineQ}
                        onSetInlineQErrors={setInlineQErrors}
                        onBulkImport={handleBulkImport}
                        onDeleteQuestion={handleDeleteQuestion}
                        onEditQuestion={handleEditQuestion}
                        onSaveInlineQuestion={handleSaveInlineQuestion}
                        onLoadQuestions={loadQuestions}
                        onPushLive={handlePushLive}
                    />
                )}

                {/* TAB 3: SETTINGS / TIMER CONTROL */}
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
