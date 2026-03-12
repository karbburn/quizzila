"use client";

import React, { useState, useEffect } from "react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Check, X, Trophy, Timer, BrainCircuit, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { initialQuestions, type Question } from "@/data/questions";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { TheInfiniteGrid } from "@/components/ui/the-infinite-grid";
import { useGameSession } from "@/hooks/useGameSession";
import { sessionService } from "@/services/sessionService";

export default function QuizzilaLive() {
  const {
    gameState,
    setGameState,
    currentQue,
    timeLeft,
    isInitialized
  } = useGameSession();

  const [quizQuestions] = useState<Question[]>(initialQuestions);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [team, setTeam] = useState<{ id: string, name: string } | null>(null);
  const [regData, setRegData] = useState({ teamName: '', member1: '', member2: '', member3: '', member4: '' });
  const [isRegistering, setIsRegistering] = useState(false);

  // Load team from localStorage on mount
  useEffect(() => {
    const savedTeam = localStorage.getItem('quizzila_team');
    if (savedTeam) {
      setTeam(JSON.parse(savedTeam));
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.teamName || !regData.member1) return;

    setIsRegistering(true);
    const device_id = 'dev_' + Math.random().toString(36).substr(2, 9);

    const newTeam = await sessionService.registerTeam({
      team_name: regData.teamName,
      member1: regData.member1,
      member2: regData.member2 || undefined,
      member3: regData.member3 || undefined,
      member4: regData.member4 || undefined,
      device_id
    });

    if (newTeam) {
      const teamInfo = { id: newTeam.id, name: newTeam.team_name };
      setTeam(teamInfo);
      localStorage.setItem('quizzila_team', JSON.stringify(teamInfo));
      setGameState('lobby');
    }
    setIsRegistering(false);
  };

  // Reset local state when question changes
  useEffect(() => {
    setSelectedOption(null);
  }, [currentQue]);

  const handleOptionClick = async (option: string) => {
    if (selectedOption || gameState !== "quiz") return;
    setSelectedOption(option);

    if (team) {
      await sessionService.submitAnswer({
        team_id: team.id,
        question_id: quizQuestions[currentQue].numb.toString(), // Using numb as fallback if id is missing, or update Question type
        selected_option: (['A', 'B', 'C', 'D'][quizQuestions[currentQue].options.indexOf(option)] || 'A') as 'A' | 'B' | 'C' | 'D',
        is_correct: option === quizQuestions[currentQue].answer,
      }, timeLeft);
    }

    if (option === quizQuestions[currentQue].answer) {
      setScore((prev) => prev + 1);
    }
  };

  // Auto-timeout logic (local)
  useEffect(() => {
    if (timeLeft === 0 && gameState === "quiz" && !selectedOption) {
      handleOptionClick("");
    }
  }, [timeLeft, gameState, selectedOption]);


  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center relative overflow-hidden font-sans">

      {/* 1. PRE-GAME STATES (Wrapped in Infinite Grid) */}
      {gameState !== "quiz" && gameState !== "finished" ? (
        <TheInfiniteGrid className="absolute inset-0">
          <div className="z-10 w-full max-w-2xl px-6">

            {/* ENTRY: Landing Page */}
            {gameState === "entry" && (
              <div className="text-center space-y-10 animate-in fade-in zoom-in duration-700">
                <div className="space-y-4">
                  <div className="inline-block p-1 bg-white rounded-3xl mb-4 border border-yellow-500/20 overflow-hidden shadow-2xl">
                    <img
                      src="/tqm_logo.jpg"
                      alt="TQM Logo"
                      className="w-24 h-24 object-contain"
                    />
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

            {/* LOBBY: Registration or Waiting Room */}
            {gameState === "lobby" && (
              <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                {!team ? (
                  <form onSubmit={handleRegister} className="bg-card/50 backdrop-blur-xl border border-border p-8 rounded-[2rem] space-y-6">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-black tracking-tight text-yellow-500 uppercase">Team Join</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Auditorium Entry</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider ml-1">Team Name</label>
                        <input
                          required
                          className="w-full bg-background border border-border px-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all font-bold"
                          placeholder="Coolest Team Ever"
                          value={regData.teamName}
                          onChange={e => setRegData({ ...regData, teamName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider ml-1">Member 1 (Lead)</label>
                        <input
                          required
                          className="w-full bg-background border border-border px-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all"
                          placeholder="Your Name"
                          value={regData.member1}
                          onChange={e => setRegData({ ...regData, member1: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input className="bg-background border border-border px-3 py-2 rounded-lg text-xs" placeholder="Member 2" value={regData.member2} onChange={e => setRegData({ ...regData, member2: e.target.value })} />
                        <input className="bg-background border border-border px-3 py-2 rounded-lg text-xs" placeholder="Member 3" value={regData.member3} onChange={e => setRegData({ ...regData, member3: e.target.value })} />
                        <input className="bg-background border border-border px-3 py-2 rounded-lg text-xs" placeholder="Member 4" value={regData.member4} onChange={e => setRegData({ ...regData, member4: e.target.value })} />
                      </div>
                    </div>

                    <button
                      disabled={isRegistering}
                      className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isRegistering ? 'Joining...' : 'Enter Auditorium'}
                    </button>
                  </form>
                ) : (
                  <div className="text-center space-y-16">
                    <div className="flex flex-col items-center gap-4 mb-2">
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-yellow-500/20 shadow-xl">
                        <img src="/tqm_logo.jpg" alt="TQM Logo" className="w-full h-full object-contain" />
                      </div>
                      <div className="text-center space-y-1">
                        <h1 className="text-3xl font-black tracking-tighter uppercase text-yellow-500 leading-none">Quizzila Live</h1>
                        <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                          <p className="text-blue-400 font-bold uppercase tracking-widest text-[8px]">Team: {team.name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="relative py-12">
                      <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full" />
                      <div className="relative space-y-2">
                        <span className="text-[120px] font-black tracking-tighter leading-none bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
                          {team.name.length * 7 + 12}
                        </span>
                        <p className="text-xl font-bold tracking-widest uppercase text-slate-500">Teams Ready</p>
                      </div>
                    </div>
                    <div className="flex justify-center flex-col items-center gap-8">
                      <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Synchronized</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COUNTDOWN */}
            {gameState === "countdown" && (
              <div className="text-center space-y-12 animate-in fade-in zoom-in duration-500">
                <div className="space-y-4">
                  <p className="text-yellow-500 font-black uppercase tracking-[0.3em] text-sm animate-bounce">Host started the quiz</p>
                  <h2 className="text-2xl font-bold text-slate-400">Quiz will begin shortly</h2>
                </div>
                <div className="relative flex items-center justify-center p-20">
                  <div className="absolute inset-0 bg-yellow-500/10 blur-[100px] rounded-full animate-pulse" />
                  <div key={timeLeft} className="text-[180px] font-black tracking-tighter leading-none bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent animate-count-pump">
                    {Math.max(1, Math.ceil(timeLeft / 6))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </TheInfiniteGrid>
      ) : (
        /* 2. ACTIVE GAME STATES (Quiz & Results) */
        <div className="w-full h-full flex items-center justify-center p-4">
          {/* Quiz Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[120px] animate-mesh-1" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 rounded-full blur-[120px] animate-mesh-2" />
            <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[100px] animate-mesh-3" />
          </div>

          <div className="fixed top-8 right-8 flex items-center gap-4 animate-in fade-in duration-500 z-50">
            <div className="flex items-center gap-3 bg-card backdrop-blur-md border border-border p-3 rounded-2xl shadow-2xl">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-yellow-500/20 shadow-lg">
                <img src="/tqm_logo.jpg" alt="TQM" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-tighter">Quizzila</h1>
                <p className="text-[8px] uppercase tracking-[0.2em] text-orange-400 font-bold">Auditorium Mode</p>
              </div>
            </div>
          </div>

          <div className="z-10 w-full max-w-2xl">
            {/* QUIZ */}
            {gameState === "quiz" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <header className="flex justify-between items-center bg-card backdrop-blur-md p-6 rounded-3xl border border-border shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 p-2 opacity-30">
                    <span className="text-[8px] font-bold tracking-widest uppercase text-blue-400">Live Sync</span>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000" style={{ width: `${(timeLeft / 30) * 100}%` }} />
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Phase</span>
                    <p className="text-lg font-black tracking-tight">{quizQuestions[currentQue].numb} <span className="text-slate-500 font-normal">/ {quizQuestions.length}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    {gameState === "quiz" && !selectedOption && (
                      <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-2 rounded-2xl border border-yellow-500/20 animate-in fade-in zoom-in duration-300">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs font-black text-yellow-500">+{sessionService.calculateFFFPoints(timeLeft)} pts</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 bg-muted/40 px-4 py-2 rounded-2xl border border-border">
                      <Timer className={cn("w-5 h-5", timeLeft < 7 ? "text-red-500 animate-pulse" : "text-blue-400")} />
                      <span className="text-xl font-black tabular-nums">{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
                    </div>
                  </div>
                </header>

                <div className="bg-card backdrop-blur-xl border border-border p-10 rounded-[2.5rem] shadow-2xl space-y-8">
                  <h2 className="text-2xl font-bold leading-tight">{quizQuestions[currentQue].question}</h2>
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
                </div>
              </div>
            )}

            {/* FINISHED */}
            {gameState === "finished" && (
              <div className="bg-card backdrop-blur-xl border border-border p-12 rounded-[3.5rem] shadow-2xl text-center space-y-8 animate-in zoom-in duration-500">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                  <div className="relative p-7 bg-white rounded-3xl shadow-2xl overflow-hidden border border-yellow-500/20">
                    <img src="/tqm_logo.jpg" alt="TQM Logo" className="w-24 h-24 object-contain" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-5xl font-black tracking-tight leading-none">THE END</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Auditorium Validation Complete</p>
                </div>
                <div className="bg-muted/50 rounded-[2.5rem] p-10 border border-border shadow-inner">
                  <p className="text-slate-500 uppercase tracking-widest text-[10px] font-bold mb-4">Your Intelligence Quotient</p>
                  <h3 className="text-7xl font-black tracking-tighter tabular-nums">{Math.round((score / quizQuestions.length) * 100)}<span className="text-2xl text-slate-600">%</span></h3>
                </div>
                <p className="text-slate-500 text-xs">Leaderboard will be projected on the main screen.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
