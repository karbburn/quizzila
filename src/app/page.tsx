"use client";

import React, { useState, useEffect } from "react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Check, X, Trophy, Timer, ArrowRight, BrainCircuit, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { initialQuestions, type Question } from "@/data/questions";
import { supabase } from "@/lib/supabase";
import { type GameSession } from "@/data/session";

export default function QuizzilaLive() {
  const [gameState, setGameState] = useState<"entry" | "lobby" | "quiz" | "leaderboard" | "finished">("entry");
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(initialQuestions);
  const [currentQue, setCurrentQue] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showNext, setShowNext] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // For local testing/admin view
  const [playerCount, setPlayerCount] = useState(0);

  // --- Real-time Sync Logic ---
  useEffect(() => {
    // 1. Subscribe to the game session
    const channel = supabase
      .channel('live-quiz')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions' },
        (payload) => {
          const newSession = payload.new as GameSession;
          handleSessionUpdate(newSession);
        }
      )
      .subscribe();

    // 2. Fetch initial state
    const fetchSession = async () => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .single();

      if (data && !error) {
        handleSessionUpdate(data as GameSession);
      }
    };

    fetchSession();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSessionUpdate = (session: GameSession) => {
    setCurrentQue(session.current_question_index);

    // Sync Game State
    if (session.status === 'LOBBY') setGameState('lobby');
    if (session.status === 'QUESTION') {
      setGameState('quiz');
      resetQueForNewSync(session.timer_start);
    }
    if (session.status === 'FINISHED') setGameState('finished');
  };

  const resetQueForNewSync = (timerStart: string | null) => {
    setSelectedOption(null);
    setShowNext(false);

    if (timerStart) {
      const startTime = new Date(timerStart).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, 30 - diff);
      setTimeLeft(remaining);
    } else {
      setTimeLeft(30);
    }
  };

  // --- Timer Logic ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === "quiz" && timeLeft > 0 && !selectedOption) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !selectedOption) {
      handleOptionClick(""); // Auto-timeout
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft, selectedOption]);

  const handleOptionClick = (option: string) => {
    if (selectedOption || gameState !== "quiz") return;
    setSelectedOption(option);
    if (option === quizQuestions[currentQue].answer) {
      setScore((prev) => prev + 1);
    }
  };

  // --- Admin Controls (For UI testing) ---
  const triggerNextQuestion = async () => {
    const nextIdx = currentQue + 1;
    if (nextIdx < quizQuestions.length) {
      await supabase
        .from('game_sessions')
        .update({
          current_question_index: nextIdx,
          status: 'QUESTION',
          timer_start: new Date().toISOString()
        })
        .eq('id', 'active-session');
    } else {
      await supabase
        .from('game_sessions')
        .update({ status: 'FINISHED' })
        .eq('id', 'active-session');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0c10] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 text-blue-500/10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="z-10 w-full max-w-2xl">
        {/* Branding Header */}
        <div className="fixed top-8 right-8 flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl">
          <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-black font-black text-xl italic shadow-[0_0_15px_rgba(234,179,8,0.4)]">
            ?
          </div>
          <div>
            <h1 className="text-sm font-black leading-tight tracking-tighter uppercase">Quizzila</h1>
            <p className="text-[8px] uppercase tracking-[0.2em] text-orange-400 font-bold">Auditorium Mode</p>
          </div>
        </div>

        {/* ENTRY: Landing Page */}
        {gameState === "entry" && (
          <div className="text-center space-y-10 animate-in fade-in zoom-in duration-700">
            <div className="space-y-4">
              <div className="inline-block p-4 bg-yellow-500/10 rounded-3xl mb-4 border border-yellow-500/20">
                <BrainCircuit className="w-12 h-12 text-yellow-500" />
              </div>
              <h2 className="text-8xl font-black tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
                Quizzila
              </h2>
              <p className="text-slate-500 font-medium tracking-wide uppercase text-xs">The Ultimate TQM Assessment Platform</p>
            </div>

            <div className="flex justify-center pt-8">
              <InteractiveHoverButton
                text="Start Quiz"
                onClick={() => setGameState("lobby")}
                className="w-56 h-14 text-xl"
              />
            </div>
          </div>
        )}

        {/* LOBBY: Waiting for Admin */}
        {gameState === "lobby" && (
          <div className="text-center space-y-12 animate-in fade-in zoom-in duration-700">
            <div className="space-y-6">
              <h2 className="text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
                JOINED
              </h2>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Waiting for Admin to Engage</span>
                </div>
                <p className="text-slate-500 text-sm italic mt-4">The arena is being prepared...</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 max-w-[200px] mx-auto">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <Users className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <p className="text-2xl font-black">{playerCount}+</p>
                <p className="text-[10px] uppercase text-slate-500 font-bold">Players Ready</p>
              </div>
            </div>
          </div>
        )}

        {/* QUIZ: Synced Question Phase */}
        {gameState === "quiz" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 p-2 opacity-50">
                <span className="text-[8px] font-bold tracking-widest uppercase text-blue-400">Live Sync</span>
              </div>

              {/* Progress Line */}
              <div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              />

              <div>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Phase</span>
                <p className="text-lg font-black tracking-tight">
                  {quizQuestions[currentQue].numb} <span className="text-slate-500 font-normal">/ {quizQuestions.length}</span>
                </p>
              </div>

              <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
                <Timer className={cn("w-5 h-5", timeLeft < 7 ? "text-red-500 animate-pulse" : "text-blue-400")} />
                <span className="text-xl font-black tabular-nums">{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
              </div>
            </header>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
              <h2 className="text-2xl font-bold leading-tight">
                {quizQuestions[currentQue].question}
              </h2>

              <div className="grid gap-4">
                {quizQuestions[currentQue].options.map((option, i) => {
                  const isCorrect = option === quizQuestions[currentQue].answer;
                  const isSelected = selectedOption === option;
                  const shouldShowFeedback = selectedOption !== null || timeLeft === 0;

                  return (
                    <button
                      key={i}
                      disabled={shouldShowFeedback}
                      onClick={() => handleOptionClick(option)}
                      className={cn(
                        "group relative flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 text-left",
                        !shouldShowFeedback && "border-white/10 hover:border-blue-500/50 hover:bg-white/5 bg-white/2 hover:pl-8",
                        shouldShowFeedback && isCorrect && "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
                        isSelected && !isCorrect && "border-red-500/50 bg-red-500/10 text-red-400",
                        shouldShowFeedback && !isCorrect && !isSelected && "opacity-40 grayscale"
                      )}
                    >
                      <span className="font-semibold">{option}</span>
                      {shouldShowFeedback && isCorrect && <Check className="w-5 h-5 text-emerald-400" />}
                      {isSelected && !isCorrect && <X className="w-5 h-5 text-red-500" />}
                    </button>
                  );
                })}
              </div>

              {selectedOption && (
                <div className="text-center pt-4 italic text-slate-500 animate-pulse text-xs">
                  Selection Recorded. Waiting for others...
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESULTS: Final Metrics */}
        {gameState === "finished" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-[3.5rem] shadow-2xl text-center space-y-8 animate-in zoom-in duration-500">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
              <div className="relative p-7 bg-gradient-to-b from-slate-100 to-slate-400 rounded-3xl shadow-2xl">
                <Trophy className="w-16 h-16 text-black" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-5xl font-black tracking-tight text-white leading-none">THE END</h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Auditorium Validation Complete</p>
            </div>

            <div className="bg-black/60 rounded-[2.5rem] p-10 border border-white/5 shadow-inner">
              <p className="text-slate-500 uppercase tracking-widest text-[10px] font-bold mb-4">Your Intelligence Quotient</p>
              <h3 className="text-7xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">
                {Math.round((score / quizQuestions.length) * 100)}<span className="text-2xl text-slate-600">%</span>
              </h3>
              <p className="mt-6 text-slate-400 text-sm leading-relaxed">
                You successfully navigated <span className="text-blue-400 font-bold">{score}</span> of the <span className="text-white font-bold">{quizQuestions.length}</span> TQM protocols.
              </p>
            </div>

            <p className="text-slate-500 text-xs py-4">Leaderboard will be projected on the main screen.</p>
          </div>
        )}
      </div>
    </div>
  );
}
