"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { QuizState, Question, AnswerStats } from "@/data/session";

interface QuizControlProps {
  quizState: QuizState | null;
  questions: Question[];
  answerStats: AnswerStats;
  teamCount: number;
  allTeams: { team_name: string; member1: string; created_at: string }[];
  teams: { name: string; score: number; answers: number }[];
  liveTimer: number;
  answersLocked: boolean;
  onStartQuiz: () => void;
  onNextQuestion: () => void;
  onShowLeaderboard: () => void;
  onRevealAnswer: () => void;
  onSkip: () => void;
  onLockAnswers: () => void;
}

export function QuizControl({
  quizState,
  questions,
  answerStats,
  teamCount,
  allTeams,
  teams,
  liveTimer,
  answersLocked,
  onStartQuiz,
  onNextQuestion,
  onShowLeaderboard,
  onRevealAnswer,
  onSkip,
  onLockAnswers,
}: QuizControlProps) {
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
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Status Header Bar */}
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

      {/* Control Buttons Row */}
      <div className="flex flex-wrap gap-3">
        <button onClick={onStartQuiz} disabled={quizState?.status !== 'waiting'} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-600 rounded-lg font-bold uppercase text-xs tracking-wider transition-all active:scale-95 flex items-center gap-2">
          Play Quiz
        </button>
        <button onClick={onNextQuestion} disabled={quizState?.status === 'waiting' || quizState?.status === 'finished'} className="px-8 py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed border border-emerald-600 rounded-lg font-bold uppercase text-xs tracking-wider transition-all active:scale-95 flex items-center gap-2 text-emerald-100">
          Next Question
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={onShowLeaderboard} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95">Show Leaderboard</button>
        <button onClick={onRevealAnswer} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95">Reveal Answer</button>
        <button onClick={onSkip} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95">Skip Question</button>
        <button
          onClick={onLockAnswers}
          disabled={quizState?.status !== 'question_active'}
          className="px-4 py-2.5 bg-red-900/40 hover:bg-red-900/60 disabled:opacity-30 disabled:cursor-not-allowed border border-red-500/30 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center gap-1.5 text-red-100"
        >
          Lock Answers
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

      {/* Main Content Grid */}
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

      {/* Teams & Leaderboard Section */}
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
  );
}
