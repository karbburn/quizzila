"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { TheInfiniteGrid } from "@/components/ui/the-infinite-grid";
import { useGameSession } from "@/hooks/useGameSession";
import { sessionService } from "@/services/sessionService";
import { sanitizeRegistration, validateRegistration } from "@/lib/sanitize";
import type { AnswerStats, LeaderboardEntry, TeamInfo, RegData, RegErrors } from "@/data/session";
import {
  QuizEntry,
  QuizRegistration,
  QuizLobby,
  QuizCountdown,
  QuizQuestion,
  QuizReveal,
  QuizLeaderboard,
  QuizFinished,
} from "@/components/quiz";

export default function QuizzilaLive() {
  const {
    gameState,
    quizStatus,
    setGameState,
    currentQue,
    stepNumber,
    currentQuestionData,
    timeLeft,
    teamCount
  } = useGameSession();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptionFeedback, setSelectedOptionFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [answerStats, setAnswerStats] = useState<AnswerStats | null>(null);
  const [submissionLatency, setSubmissionLatency] = useState<number | null>(null);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [regData, setRegData] = useState<RegData>({ teamName: '', member1: '', member2: '', member3: '', member4: '' });
  const [regErrors, setRegErrors] = useState<RegErrors>({});
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
    const device_id = 'dev_' + crypto.randomUUID();

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
            setSelectedOption("ALREADY_ANSWERED");
          }
        });
    }
  }, [currentQue, team, gameState, currentQuestionData]);

  const handleOptionClick = useCallback(async (option: string) => {
    if (selectedOption || gameState !== "quiz" || quizStatus !== 'question_active') return;
    setSelectedOption(option);

    const startTime = performance.now();

    if (team && currentQuestionData) {
      // Find the normalized A B C D character for the selected option
      const optionIndex = currentQuestionData.options.indexOf(option);
      const normalizedOption = (['A', 'B', 'C', 'D'][optionIndex] || 'A') as 'A' | 'B' | 'C' | 'D';

      // Server computes is_correct - we only send selected option
      const result = await sessionService.submitAnswerSecure(
        team.id,
        currentQuestionData.id,
        normalizedOption,
        timeLeft
      );

      const endTime = performance.now();
      setSubmissionLatency(Math.round(endTime - startTime));
      setSelectedOptionFeedback(result.is_correct ? "correct" : "incorrect");
    }
  }, [selectedOption, gameState, quizStatus, team, currentQuestionData, timeLeft]);

  // Auto-timeout logic (local)
  useEffect(() => {
    if (timeLeft === 0 && gameState === "quiz" && !selectedOption) {
      handleOptionClick("TIMEOUT");
    }
  }, [timeLeft, gameState, selectedOption, handleOptionClick]);

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

  const handleStartQuiz = () => {
    if (team) {
      setGameState('lobby');
    } else {
      setGameState("register");
    }
  };

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
              <QuizEntry
                team={team}
                showAdminLogin={showAdminLogin}
                adminCreds={adminCreds}
                adminError={adminError}
                onAdminLogin={handleAdminLogin}
                onSetShowAdminLogin={setShowAdminLogin}
                onSetAdminCreds={setAdminCreds}
                onStartQuiz={handleStartQuiz}
              />
            )}

            {gameState === "register" && (
              <QuizRegistration
                showWelcome={showWelcome}
                regData={regData}
                regErrors={regErrors}
                nameTaken={nameTaken}
                isRegistering={isRegistering}
                quizStatus={quizStatus}
                onSubmit={handleRegister}
                onSetRegData={setRegData}
                onSetRegErrors={setRegErrors}
              />
            )}

            {/* LOBBY: Waiting Room */}
            {gameState === "lobby" && (
              <QuizLobby team={team} teamCount={teamCount} />
            )}

            {/* COUNTDOWN */}
            {gameState === "countdown" && (
              <QuizCountdown stepNumber={stepNumber} timeLeft={timeLeft} />
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
              <QuizQuestion
                currentQuestionData={currentQuestionData}
                stepNumber={stepNumber}
                timeLeft={timeLeft}
                quizStatus={quizStatus}
                selectedOption={selectedOption}
                submissionLatency={submissionLatency}
                onOptionClick={handleOptionClick}
              />
            )}

            {/* REVEAL: Result + Stats */}
            {gameState === "reveal" && currentQuestionData && (
              <QuizReveal
                currentQuestionData={currentQuestionData}
                currentQue={currentQue}
                selectedOptionFeedback={selectedOptionFeedback}
                selectedOption={selectedOption}
                answerStats={answerStats}
              />
            )}

            {/* LEADERBOARD */}
            {gameState === "leaderboard" && (
              <QuizLeaderboard leaderboard={leaderboard} />
            )}

            {/* FINISHED */}
            {gameState === "finished" && <QuizFinished />}
          </div>
        </div>
      )}
    </div>
  );
}
