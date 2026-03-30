"use client";

import React, { useState, useEffect } from "react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Check, X, Trophy, Timer, BrainCircuit, ShieldCheck, ShieldAlert, Users, Sparkles, AlertCircle, Activity, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { initialQuestions, type Question } from "@/data/questions";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { TheInfiniteGrid } from "@/components/ui/the-infinite-grid";
import { useGameSession } from "@/hooks/useGameSession";
import { sessionService } from "@/services/sessionService";
import { sanitizeRegistration, validateRegistration, sanitizeTeamName, sanitizeMemberName } from "@/lib/sanitize";

export default function QuizzilaLive() {
  const {
    gameState,
    quizStatus,
    setGameState,
    currentQue,
    stepNumber,
    currentQuestionData,
    timeLeft,
    setTimeLeft,
    teamCount,
    isInitialized
  } = useGameSession();

  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptionFeedback, setSelectedOptionFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [answerStats, setAnswerStats] = useState<{ A: number; B: number; C: number; D: number; total: number } | null>(null);
  const [submissionLatency, setSubmissionLatency] = useState<number | null>(null);
  const [team, setTeam] = useState<{ id: string, name: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ team_name: string; score: number; rank: number }[]>([]);
  const [regData, setRegData] = useState({ teamName: '', member1: '', member2: '', member3: '', member4: '' });
  const [regErrors, setRegErrors] = useState<{ teamName?: string; member1?: string }>({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [nameTaken, setNameTaken] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ username: '', password: '' });
  const [adminError, setAdminError] = useState('');
  const router = useRouter();

  const handleAdminLogin = () => {
    if (adminCreds.username === 'TheQuizMasters' && adminCreds.password === 'TheQuizMasters2350') {
      router.push('/admin');
    } else {
      setAdminError('Invalid credentials');
      setTimeout(() => setAdminError(''), 2000);
    }
  };

  // Load team from localStorage on mount and verify it exists
  useEffect(() => {
    const savedTeam = localStorage.getItem('quizzila_team');
    if (savedTeam) {
      const parsedTeam = JSON.parse(savedTeam);
      sessionService.isTeamValid(parsedTeam.id).then(valid => {
        if (valid) {
          setTeam(parsedTeam);
          // If team is valid, move to lobby immediately
          setGameState('lobby');
        } else {
          localStorage.removeItem('quizzila_team');
          setTeam(null);
        }
      });
    }
  }, [setGameState]);

  // Duplicate Team Name Check
  useEffect(() => {
    if (regData.teamName.trim().length > 0) {
      const timer = setTimeout(async () => {
        const taken = await sessionService.isTeamNameTaken(regData.teamName);
        setNameTaken(taken);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setNameTaken(false);
    }
  }, [regData.teamName]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    const errors = validateRegistration(regData);
    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }
    setRegErrors({});

    if (nameTaken) return;
    if (quizStatus !== 'waiting') return; // Lock if quiz started

    setIsRegistering(true);
    const device_id = 'dev_' + Math.random().toString(36).substr(2, 9);

    // Sanitize inputs before sending
    const sanitized = sanitizeRegistration(regData);

    const newTeam = await sessionService.registerTeam({
      team_name: sanitized.team_name,
      member1: sanitized.member1,
      member2: sanitized.member2 || undefined,
      member3: sanitized.member3 || undefined,
      member4: sanitized.member4 || undefined,
      device_id
    });

    if (newTeam) {
      const teamInfo = { id: newTeam.id, name: newTeam.team_name };
      setShowWelcome(true);
      setTimeout(() => {
        setTeam(teamInfo);
        localStorage.setItem('quizzila_team', JSON.stringify(teamInfo));
        setGameState('lobby');
        setShowWelcome(false);
      }, 2000);
    }
    setIsRegistering(false);
  };

  // Reset local state when question changes
  useEffect(() => {
    setSelectedOption(null);
    setSelectedOptionFeedback(null);

    // Check if team already answered this question (persistence)
    if (team && currentQuestionData && gameState === "quiz") {
      sessionService.hasAnswered(team.id, currentQuestionData.id)
        .then(answered => {
          if (answered) {
            setSelectedOption("ALREADY_ANSWERED" as any); // Lock UI
          }
        });
    }
  }, [currentQue, team, gameState, currentQuestionData]);

  const handleOptionClick = async (option: string) => {
    if (selectedOption || gameState !== "quiz" || quizStatus !== 'question_active') return;
    setSelectedOption(option);

    const startTime = performance.now();

    if (team && currentQuestionData) {
      // Find the normalized A B C D character for the selected option
      const optionIndex = currentQuestionData.options.indexOf(option);
      const normalizedOption = (['A', 'B', 'C', 'D'][optionIndex] || 'A') as 'A' | 'B' | 'C' | 'D';

      // We assume correct_option is either the text itself or 'A','B','C','D'.
      const isCorrect = option === currentQuestionData.correct_option || normalizedOption === currentQuestionData.correct_option;

      await sessionService.submitAnswer({
        team_id: team.id,
        question_id: currentQuestionData.id,
        selected_option: normalizedOption,
        is_correct: isCorrect,
      }, timeLeft);

      const endTime = performance.now();
      setSubmissionLatency(Math.round(endTime - startTime));
      setSelectedOptionFeedback(isCorrect ? "correct" : "incorrect");
    }
  };

  // Auto-timeout logic (local)
  useEffect(() => {
    if (timeLeft === 0 && gameState === "quiz" && !selectedOption) {
      handleOptionClick("TIMEOUT");
    }
  }, [timeLeft, gameState, selectedOption]);

  // Fetch stats during reveal
  useEffect(() => {
    if (gameState === "reveal" && currentQuestionData?.id) {
      sessionService.getAnswerStats(currentQuestionData.id).then(setAnswerStats);
    } else {
      setAnswerStats(null);
    }
  }, [gameState, currentQuestionData?.id]);

  // Fetch leaderboard when triggered
  useEffect(() => {
    if (gameState === "leaderboard") {
      sessionService.getLeaderboard(10).then(setLeaderboard);
    }
  }, [gameState]);


  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center relative overflow-hidden font-sans">
      <div className="fixed top-8 right-8 z-[100]">
        <ToggleTheme />
      </div>


      {/* 1. PRE-GAME STATES (Wrapped in Infinite Grid) */}
      {gameState !== "quiz" && gameState !== "finished" && gameState !== "reveal" && gameState !== "leaderboard" ? (
        <TheInfiniteGrid className="absolute inset-0">
          <div className="z-10 w-full max-w-2xl px-6">

            {/* ENTRY: Landing Page */}
            {gameState === "entry" && (
              <div className="text-center space-y-10 animate-in fade-in zoom-in duration-700">
                <button onClick={() => setShowAdminLogin(true)} className="fixed top-8 left-8 z-[100] px-4 py-2 bg-card/80 backdrop-blur-md border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:border-yellow-500/50 transition-all flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5" /> Admin Login
                </button>

                {showAdminLogin && (
                  <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center animate-in fade-in duration-200" onClick={() => setShowAdminLogin(false)}>
                    <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                      <div className="text-center space-y-1">
                        <ShieldAlert className="w-8 h-8 text-yellow-500 mx-auto" />
                        <h3 className="text-xl font-black uppercase tracking-tight">Admin Access</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Authorized Personnel Only</p>
                      </div>
                      <div className="space-y-3">
                        <input type="text" placeholder="Username" value={adminCreds.username} onChange={e => setAdminCreds({ ...adminCreds, username: e.target.value })} className="w-full bg-background border border-border px-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all text-sm" />
                        <input type="password" placeholder="Password" value={adminCreds.password} onChange={e => setAdminCreds({ ...adminCreds, password: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} className="w-full bg-background border border-border px-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all text-sm" />
                      </div>
                      {adminError && <p className="text-red-400 text-xs font-bold text-center">{adminError}</p>}
                      <button onClick={handleAdminLogin} className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest rounded-xl transition-all active:scale-95">
                        Login
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="inline-block p-1 bg-white rounded-3xl mb-4 border border-yellow-500/20 overflow-hidden shadow-2xl">
                    <img
                      src="/tqm_logo.jpg"
                      alt="Logo"
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                  <h2 className="text-8xl font-black tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
                    Quizzila
                  </h2>
                  <p className="text-slate-500 font-medium tracking-wide uppercase text-xs">The Ultimate TQM Platform</p>
                </div>
                <div className="flex justify-center pt-8">
                  <InteractiveHoverButton
                    text="Start Quiz"
                    onClick={() => {
                      if (team) {
                        setGameState('lobby');
                      } else {
                        setGameState("register" as any);
                      }
                    }}
                    className="w-56 h-14 text-xl"
                  />
                </div>
              </div>
            )}

            {(gameState as string) === "register" && (
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
                      <h3 className="text-3xl font-black tracking-tight text-white uppercase italic">Welcome</h3>
                      <p className="text-xl font-bold text-yellow-500 uppercase tracking-widest">{regData.teamName} 🎉</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="bg-card/50 backdrop-blur-xl border border-border p-8 rounded-[2rem] space-y-6">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-2 flex items-center justify-center overflow-hidden border border-yellow-500/20 shadow-lg">
                        <img src="/tqm_logo.jpg" alt="TQM Logo" className="w-full h-full object-contain" />
                      </div>
                      <h3 className="text-2xl font-black tracking-tight text-yellow-500 uppercase">Team Join</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Quiz Entry</p>
                    </div>

                    {quizStatus !== 'waiting' ? (
                      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center space-y-2">
                        <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
                        <h4 className="text-red-400 font-black uppercase tracking-tight">Access Locked</h4>
                        <p className="text-xs text-red-500/80 font-medium">Quiz has already started. New teams cannot join.</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                              <label className="text-[10px] font-black uppercase tracking-wider">Team Name</label>
                              <span className={cn("text-[9px] font-bold", regData.teamName.length > 25 ? "text-red-500" : "text-slate-500")}>
                                {regData.teamName.length}/25
                              </span>
                            </div>
                            <input
                              required
                              maxLength={30}
                              className={cn(
                                "w-full bg-background border px-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all font-bold text-sm",
                                nameTaken || regErrors.teamName || regData.teamName.length > 25 ? "border-red-500/50" : "border-border"
                              )}
                              placeholder="Coolest Team Ever"
                              value={regData.teamName}
                              onChange={e => {
                                const value = sanitizeTeamName(e.target.value);
                                setRegData({ ...regData, teamName: value });
                                if (regErrors.teamName) setRegErrors({ ...regErrors, teamName: undefined });
                              }}
                            />
                            {(nameTaken || regErrors.teamName) && (
                              <p className="text-[10px] text-red-400 font-bold mt-1 ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                                <ShieldAlert className="w-3 h-3" /> {regErrors.teamName || 'Team name already taken'}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider ml-1">Member 1 (Lead)</label>
                            <input
                              required
                              className={cn(
                                "w-full bg-background border px-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all text-sm",
                                regErrors.member1 ? "border-red-500/50" : "border-border"
                              )}
                              placeholder="Your Name"
                              value={regData.member1}
                              onChange={e => {
                                const value = sanitizeMemberName(e.target.value);
                                setRegData({ ...regData, member1: value });
                                if (regErrors.member1) setRegErrors({ ...regErrors, member1: undefined });
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
                              <input className="bg-background border border-border px-3 py-2 rounded-lg text-xs" placeholder="Member 2" value={regData.member2} onChange={e => setRegData({ ...regData, member2: sanitizeMemberName(e.target.value) })} />
                              <input className="bg-background border border-border px-3 py-2 rounded-lg text-xs" placeholder="Member 3" value={regData.member3} onChange={e => setRegData({ ...regData, member3: sanitizeMemberName(e.target.value) })} />
                              <input className="bg-background border border-border px-3 py-2 rounded-lg text-xs" placeholder="Member 4" value={regData.member4} onChange={e => setRegData({ ...regData, member4: sanitizeMemberName(e.target.value) })} />
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isRegistering || nameTaken || !regData.teamName || !regData.member1 || regData.teamName.length > 25}
                          className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-yellow-500/10 active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
                        >
                          {isRegistering ? (
                            <span className="flex items-center justify-center gap-2">
                              <BrainCircuit className="w-5 h-5 animate-spin-slow" />
                              Joining...
                            </span>
                          ) : "Join Quiz"}
                        </button>
                      </>
                    )}
                  </form>
                )}
              </div>
            )}

            {/* LOBBY: Waiting Room */}
            {gameState === "lobby" && (
              <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center space-y-16">
                  <div className="flex flex-col items-center gap-4 mb-2">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-yellow-500/20 shadow-xl">
                      <img src="/tqm_logo.jpg" alt="TQM Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-center space-y-1">
                      <h1 className="text-3xl font-black tracking-tighter uppercase text-yellow-500 leading-none">Starting Soon</h1>
                      <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                        <p className="text-blue-400 font-bold uppercase tracking-widest text-[8px]">Team: {team?.name || 'Loading...'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="relative py-12">
                    <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full" />
                    <div className="relative space-y-2">
                      <span className="text-[120px] font-black tracking-tighter leading-none bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
                        {teamCount}
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
              </div>
            )}

            {/* COUNTDOWN */}
            {gameState === "countdown" && (
              <div className="text-center space-y-12 animate-in fade-in zoom-in duration-500">
                <div className="space-y-4">
                  <p className="text-yellow-500 font-black uppercase tracking-[0.3em] text-sm animate-bounce">
                    {stepNumber === 1 ? "Host started the quiz" : "Get Ready"}
                  </p>
                  <h2 className="text-2xl font-bold text-slate-400">
                    {stepNumber === 1 ? "Quiz will begin shortly" : `Question ${stepNumber} is about to appear!`}
                  </h2>
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
            {/* QUIZ: Question + Submission */}
            {gameState === "quiz" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <header className="flex justify-between items-center bg-card backdrop-blur-md p-6 rounded-3xl border border-border shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 p-2 opacity-30">
                    <span className="text-[8px] font-bold tracking-widest uppercase text-blue-400">Live Sync</span>
                  </div>
                  <div className="absolute top-0 right-0 p-2">
                    <span className={cn(
                      "text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border",
                      quizStatus === 'question_locked' ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    )}>
                      {quizStatus === 'question_locked' ? "Locked" : "Active"}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000" style={{ width: `${(timeLeft / 30) * 100}%` }} />
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Phase</span>
                    <p className="text-lg font-black tracking-tight">Question {stepNumber}</p>
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
                <div className="bg-card backdrop-blur-xl border border-border p-10 rounded-[2.5rem] shadow-2xl space-y-8 relative overflow-hidden">
                  <h2 className="text-2xl font-bold leading-tight">{currentQuestionData?.text || "Loading question..."}</h2>

                  {quizStatus === 'question_locked' && !selectedOption && (
                    <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                      <div className="text-center space-y-3">
                        <Lock className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
                        <h3 className="text-2xl font-black uppercase text-white tracking-tight">Time's Up!</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Submissions have been locked</p>
                      </div>
                    </div>
                  )}

                  {selectedOption ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in zoom-in duration-500">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl animate-pulse" />
                        <BrainCircuit className="w-20 h-20 text-blue-400 relative animate-spin-slow" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Answer Submitted</h3>
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">Waiting for other teams...</p>
                          {submissionLatency !== null && (
                            <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                              Reached server in {submissionLatency}ms
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {(currentQuestionData?.options || []).map((option: string, i: number) => {
                        const letter = ['A', 'B', 'C', 'D'][i];
                        return (
                          <button
                            key={i}
                            onClick={() => handleOptionClick(option)}
                            className="group relative flex items-center justify-between p-5 rounded-2xl border border-white/10 hover:border-yellow-500/50 hover:bg-white/5 bg-white/2 transition-all duration-300 text-left hover:pl-8 active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-xl font-black text-slate-500 group-hover:text-yellow-500 transition-colors">{letter}</span>
                              <span className="font-semibold">{option}</span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-yellow-500 transition-all group-hover:scale-150" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REVEAL: Result + Stats */}
            {gameState === "reveal" && currentQuestionData && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                <header className="bg-card backdrop-blur-md p-6 rounded-3xl border border-border shadow-xl text-center">
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-orange-400 mb-1">Answer Reveal</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Question {currentQue + 1}</p>
                </header>

                <div className="bg-card backdrop-blur-xl border border-border p-10 rounded-[2.5rem] shadow-2xl space-y-8 text-center bg-gradient-to-b from-card to-card/50">
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Correct Answer</p>
                    <div className="inline-block px-8 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                      <p className="text-3xl font-black text-emerald-400 uppercase italic tracking-tighter">
                        {currentQuestionData?.correct_option}: {currentQuestionData?.options?.[['A', 'B', 'C', 'D'].indexOf(currentQuestionData?.correct_option || 'A')]}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-border/50 w-2/3 mx-auto" />

                  <div className="space-y-6">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Result</p>
                    {selectedOptionFeedback === "correct" ? (
                      <div className="space-y-3 animate-bounce">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                          <Check className="w-12 h-12 text-emerald-500" />
                        </div>
                        <p className="text-3xl font-black text-white uppercase italic">Correct!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                          <X className="w-12 h-12 text-red-500" />
                        </div>
                        <p className="text-3xl font-black text-slate-300 uppercase italic">Incorrect</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">You selected: {selectedOption || 'No Answer'}</p>
                      </div>
                    )}
                  </div>

                  {/* Stats Visualization */}
                  {answerStats && (
                    <div className="pt-8 space-y-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Distribution</p>
                      <div className="grid grid-cols-4 gap-3 items-end h-24">
                        {['A', 'B', 'C', 'D'].map(opt => {
                          const count = (answerStats as any)[opt];
                          const height = answerStats.total > 0 ? (count / answerStats.total) * 100 : 0;
                          const isCorrect = currentQuestionData?.correct_option === opt;
                          return (
                            <div key={opt} className="space-y-2 flex flex-col items-center group">
                              <div className="text-[9px] font-black text-slate-400 group-hover:text-white transition-colors">{count}</div>
                              <div className="w-full bg-slate-800 rounded-t-lg relative overflow-hidden transition-all duration-1000" style={{ height: `${Math.max(height, 8)}%` }}>
                                <div className={cn("absolute inset-0", isCorrect ? "bg-emerald-500" : "bg-blue-500/40")} />
                              </div>
                              <div className={cn("text-xs font-black p-1 rounded-md w-full", isCorrect ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500")}>{opt}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LEADERBOARD */}
            {gameState === "leaderboard" && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                <header className="bg-card backdrop-blur-md p-6 rounded-3xl border border-border shadow-xl text-center">
                  <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3 animate-bounce" />
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-yellow-500 mb-1">Current Standings</h2>
                  <p className="text-white text-2xl font-black uppercase tracking-widest">Top Teams</p>
                </header>

                <div className="bg-card backdrop-blur-xl border border-border p-8 rounded-[2.5rem] shadow-2xl space-y-4">
                  {leaderboard.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Compiling Scores...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leaderboard.map((team, idx) => (
                        <div key={idx} className={cn("flex items-center gap-4 p-4 rounded-2xl border transition-all", idx === 0 ? "bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)]" : idx === 1 ? "bg-slate-300/10 border-slate-300/20" : idx === 2 ? "bg-amber-700/10 border-amber-700/30" : "bg-white/5 border-white/5")}>
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-inner", idx === 0 ? "bg-yellow-500 text-black" : idx === 1 ? "bg-slate-300 text-black" : idx === 2 ? "bg-amber-600 text-black" : "bg-slate-800 text-slate-400")}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 truncate">
                            <h3 className={cn("font-bold truncate text-lg", idx === 0 ? "text-yellow-500" : "text-white")}>{team.team_name}</h3>
                          </div>
                          <div className="text-right">
                            <span className={cn("font-black text-xl tabular-nums", idx === 0 ? "text-yellow-500" : "text-white")}>{team.score}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold ml-1">pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                  <p className="text-slate-500 uppercase tracking-widest text-[10px] font-bold mb-4">Correct Answers</p>
                  <h3 className="text-7xl font-black tracking-tighter tabular-nums">{score}</h3>
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
