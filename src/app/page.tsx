"use client";

import React, { useState, useEffect } from "react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Check, X, Trophy, Timer, ArrowRight, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
interface Question {
  numb: number;
  question: string;
  answer: string;
  options: string[];
}

const questions: Question[] = [
  {
    numb: 1,
    question: "What is the primary focus of Total Quality Management (TQM)?",
    answer: "Customer Satisfaction",
    options: ["Process Speed", "Customer Satisfaction", "Cost Reduction", "Market Expansion"]
  },
  {
    numb: 2,
    question: "Which of the following is a key principle of TQM implementation?",
    answer: "Continuous Improvement",
    options: ["Siloed Operations", "Annual Inspections", "Continuous Improvement", "Rigid Hierarchy"]
  },
  {
    numb: 3,
    question: "What does the 'PDCA' cycle stand for in quality management?",
    answer: "Plan-Do-Check-Act",
    options: ["Perform-Direct-Check-Analyze", "Plan-Do-Check-Act", "Prepare-Deploy-Control-Assess", "Process-Develop-Calculate-Audit"]
  },
  {
    numb: 4,
    question: "Who is often considered the 'Father of Quality Control'?",
    answer: "W. Edwards Deming",
    options: ["Henry Ford", "W. Edwards Deming", "Jack Welch", "Steve Jobs"]
  },
  {
    numb: 5,
    question: "In TQM, quality is defined primarily by whom?",
    answer: "The Customer",
    options: ["The Inspector", "The CEO", "The Engineer", "The Customer"]
  }
];

// --- Sub-components ---

export default function TQMQuizSite() {
  const [gameState, setGameState] = useState<"start" | "info" | "quiz" | "result">("start");
  const [currentQue, setCurrentQue] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showNext, setShowNext] = useState(false);

  // Timer logic
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

  const handleStart = () => setGameState("info");
  const handleContinue = () => {
    setGameState("quiz");
    resetQue();
  };
  const handleRestart = () => {
    setGameState("quiz");
    setCurrentQue(0);
    setScore(0);
    resetQue();
  };

  const resetQue = () => {
    setTimeLeft(15);
    setSelectedOption(null);
    setShowNext(false);
  };

  const handleOptionClick = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    if (option === questions[currentQue].answer) {
      setScore((prev) => prev + 1);
    }
    setShowNext(true);
  };

  const handleNext = () => {
    if (currentQue < questions.length - 1) {
      setCurrentQue((prev) => prev + 1);
      resetQue();
    } else {
      setGameState("result");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0c10] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      {/* Main Container */}
      <div className="z-10 w-full max-w-2xl">
        {/* Top Logo Branding (Top Right style requested) */}
        <div className="fixed top-8 right-8 flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl">
          <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-black font-black text-xl italic shadow-[0_0_15px_rgba(234,179,8,0.4)]">
            ?
          </div>
          <div>
            <h1 className="text-sm font-black leading-tight tracking-tighter uppercase">Quizzila</h1>
            <p className="text-[8px] uppercase tracking-[0.2em] text-orange-400 font-bold">The Quiz Masters</p>
          </div>
        </div>

        {/* Home Screen */}
        {gameState === "start" && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="space-y-4">
              <h2 className="text-6xl font-black tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
                Quizzila
              </h2>
              <p className="text-slate-400 text-lg max-w-md mx-auto">
                Step into the arena of Total Quality Management. Test your mastery, achieve excellence.
              </p>
            </div>
            <div className="flex justify-center">
              <InteractiveHoverButton text="Start Quiz" onClick={handleStart} className="w-48 h-12" />
            </div>
          </div>
        )}

        {/* Info Screen */}
        {gameState === "info" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl space-y-8 animate-in slide-in-from-bottom-12 duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-2xl">
                <BrainCircuit className="text-blue-400 w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold">Directives</h3>
            </div>
            <ul className="space-y-4 text-slate-300">
              {[
                "15 seconds per high-stakes question.",
                "Locked navigation - commitment is final.",
                "Real-time performance analytics.",
                "Excellence badge upon completion."
              ].map((text, i) => (
                <li key={i} className="flex gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  {text}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setGameState("start")}
                className="px-6 py-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent"
              >
                Abort
              </button>
              <button
                onClick={handleContinue}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/30"
              >
                Engage
              </button>
            </div>
          </div>
        )}

        {/* Quiz Screen */}
        {gameState === "quiz" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 p-2 opacity-50">
                <span className="text-[8px] font-bold tracking-widest uppercase">Quizzila</span>
              </div>
              {/* Progress Line */}
              <div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                style={{ width: `${(timeLeft / 15) * 100}%` }}
              />

              <div>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Phase</span>
                <p className="text-lg font-black tracking-tight">{questions[currentQue].numb} <span className="text-slate-500 font-normal">/ {questions.length}</span></p>
              </div>

              <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
                <Timer className={cn("w-5 h-5", timeLeft < 5 ? "text-red-500 animate-pulse" : "text-blue-400")} />
                <span className="text-xl font-black tabular-nums">{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
              </div>
            </header>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
              <h2 className="text-2xl font-bold leading-tight">
                {questions[currentQue].question}
              </h2>

              <div className="grid gap-4">
                {questions[currentQue].options.map((option, i) => {
                  const isCorrect = option === questions[currentQue].answer;
                  const isSelected = selectedOption === option;
                  const shouldShowCorrect = selectedOption && isCorrect;
                  const shouldShowWrong = isSelected && !isCorrect;

                  return (
                    <button
                      key={i}
                      disabled={!!selectedOption}
                      onClick={() => handleOptionClick(option)}
                      className={cn(
                        "group relative flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 text-left",
                        !selectedOption && "border-white/10 hover:border-blue-500/50 hover:bg-white/5 bg-white/2 hover:pl-8",
                        shouldShowCorrect && "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
                        shouldShowWrong && "border-red-500/50 bg-red-500/10 text-red-400",
                        selectedOption && !isCorrect && !isSelected && "opacity-40 grayscale"
                      )}
                    >
                      <span className="font-semibold">{option}</span>
                      {shouldShowCorrect && <Check className="w-5 h-5" />}
                      {shouldShowWrong && <X className="w-5 h-5" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-end">
                {showNext && (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-8 py-3 bg-white text-black font-black rounded-xl hover:bg-slate-200 transition-all active:scale-95 animate-in slide-in-from-right-8 duration-300"
                  >
                    {currentQue < questions.length - 1 ? "Next Phase" : "Finalize"}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Result Screen */}
        {gameState === "result" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-[3rem] shadow-2xl text-center space-y-8 animate-in zoom-in duration-500">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full" />
              <div className="relative p-6 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-3xl shadow-2xl shadow-yellow-500/20">
                <Trophy className="w-16 h-16 text-black" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tight">Assessment Finalized</h2>
              <p className="text-slate-400 font-medium">Validation metrics processed.</p>
            </div>

            <div className="bg-black/40 rounded-3xl p-8 border border-white/5">
              <p className="text-slate-500 uppercase tracking-widest text-[10px] font-bold mb-2">Accuracy achieved</p>
              <h3 className="text-6xl font-black text-blue-400 tracking-tighter tabular-nums">
                {Math.round((score / questions.length) * 100)}<span className="text-2xl text-slate-600">%</span>
              </h3>
              <p className="mt-4 text-slate-300">
                You secured <span className="text-white font-bold">{score}</span> out of <span className="text-white font-bold">{questions.length}</span> correct directives.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleRestart}
                className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-[0.98]"
              >
                Re-Initialize Session
              </button>
              <button
                onClick={() => setGameState("start")}
                className="w-full py-4 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Terminate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
