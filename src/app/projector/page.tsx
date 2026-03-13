'use client';

import React, { useState, useEffect } from 'react';
import { useGameSession } from '@/hooks/useGameSession';
import { EtheralShadow } from '@/components/ui/etheral-shadow';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Timer, Sparkles, QrCode } from 'lucide-react';

export default function ProjectorPage() {
    const {
        gameState,
        quizStatus,
        currentQuestionData,
        timeLeft,
        teamCount,
        allTeams,
        answerStats,
        stepNumber
    } = useGameSession();

    const [showQR, setShowQR] = useState(true);

    // Filter teams to show only recent joins or a random sample if too many
    const visibleTeams = allTeams.slice(-40).reverse();

    return (
        <div className="relative w-full h-screen overflow-hidden bg-slate-950 text-white font-sans">
            {/* BACKGROUND LAYER */}
            <div className="absolute inset-0 z-0 opacity-40">
                <EtheralShadow
                    color="rgba(15, 23, 42, 1)"
                    animation={{ scale: 80, speed: 20 }}
                    noise={{ opacity: 0.1, scale: 1 }}
                    title=""
                />
            </div>

            {/* CONTENT LAYER */}
            <div className="relative z-10 w-full h-full flex flex-col p-12">

                {/* 1. LOBBY / WAITING STATE */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex flex-col animate-in fade-in duration-1000">
                        <div className="flex justify-between items-start mb-12">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-yellow-500/20 shadow-xl">
                                        <img src="/tqm_logo.jpg" alt="TQM" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h1 className="text-4xl font-black uppercase tracking-tighter">Quizzila</h1>
                                        <p className="text-sm uppercase tracking-[0.3em] text-orange-400 font-bold">Live Trivia Experience</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl text-right space-y-2">
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Join the game at</p>
                                <p className="text-5xl font-black text-yellow-500 tracking-tight">quizzila-app.vercel.app</p>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-3 gap-12">
                            {/* QR CODE SECTION */}
                            <div className="col-span-1 bg-white p-8 rounded-[3rem] aspect-square flex flex-col items-center justify-center shadow-[0_0_100px_rgba(234,179,8,0.2)]">
                                <QrCode className="w-full h-full text-slate-900" strokeWidth={1} />
                                <p className="mt-4 text-slate-900 font-black text-xl uppercase">Scan to Join</p>
                            </div>

                            {/* TEAM LIST SECTION */}
                            <div className="col-span-2 space-y-8">
                                <div className="flex items-center gap-4">
                                    <Users className="w-10 h-10 text-blue-400" />
                                    <h2 className="text-4xl font-black tracking-tight">{teamCount} Teams Ready</h2>
                                </div>
                                <div className="flex flex-wrap gap-4 content-start max-h-[50vh] overflow-hidden">
                                    <AnimatePresence>
                                        {visibleTeams.map((team, i) => (
                                            <motion.div
                                                key={team.id}
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ type: 'spring', damping: 15 }}
                                                className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-xl font-bold flex items-center gap-3"
                                            >
                                                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                                                {team.team_name}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. COUNTDOWN STATE */}
                {gameState === 'countdown' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12 animate-in zoom-in duration-500">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="inline-flex items-center gap-2 bg-yellow-500/10 px-6 py-2 rounded-full border border-yellow-500/20 mb-4">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                <span className="text-yellow-500 font-black uppercase tracking-[0.3em] text-sm">Incoming Question</span>
                            </div>
                            <h2 className="text-8xl font-black tracking-tighter text-white">Question {stepNumber}</h2>
                            <p className="text-3xl font-medium text-slate-400">Get those fastest fingers ready!</p>
                        </motion.div>

                        <div className="relative flex items-center justify-center">
                            <motion.div
                                className="absolute inset-0 bg-yellow-500/20 blur-[150px] rounded-full"
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            />
                            <motion.div
                                key={timeLeft}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-[300px] font-black tracking-tighter leading-none bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent"
                            >
                                {timeLeft}
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* 3. ACTIVE QUIZ STATE */}
                {gameState === 'quiz' && (
                    <div className="flex-1 flex flex-col animate-in fade-in duration-500">
                        <header className="flex justify-between items-end mb-16">
                            <div className="space-y-2">
                                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xl">Question {stepNumber}</p>
                                <h1 className="text-7xl font-black max-w-5xl leading-[1.1] tracking-tight">{currentQuestionData?.text || "Question Loading..."}</h1>
                            </div>
                            <div className="flex flex-col items-end gap-4 min-w-[300px]">
                                <div className="flex items-center gap-6 bg-white/5 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
                                    <Timer className={cn("w-16 h-16", timeLeft < 7 ? "text-red-500 animate-pulse" : "text-blue-400")} />
                                    <span className="text-8xl font-black tabular-nums">{timeLeft}s</span>
                                </div>
                                <div className="flex items-center gap-3 bg-emerald-500/10 px-6 py-3 rounded-2xl border border-emerald-500/20">
                                    <Users className="w-6 h-6 text-emerald-500" />
                                    <span className="text-2xl font-black text-emerald-500">{answerStats.total} / {teamCount} Answers</span>
                                </div>
                            </div>
                        </header>

                        <div className="grid grid-cols-2 gap-8 flex-1 content-start">
                            {(currentQuestionData?.options || []).map((opt: string, i: number) => {
                                const letter = ['A', 'B', 'C', 'D'][i];
                                const colors = [
                                    "border-red-500/30 bg-red-500/5 text-red-100",
                                    "border-blue-500/30 bg-blue-500/5 text-blue-100",
                                    "border-yellow-500/30 bg-yellow-500/5 text-yellow-100",
                                    "border-emerald-500/30 bg-emerald-500/5 text-emerald-100"
                                ];
                                return (
                                    <div key={i} className={cn("p-8 rounded-[2rem] border-2 flex items-center gap-6 transition-all duration-500", colors[i])}>
                                        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-4xl font-black">{letter}</div>
                                        <div className="text-4xl font-bold">{opt}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 4. REVEAL / STATS STATE */}
                {gameState === 'reveal' && (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-bottom duration-700">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-2xl font-black uppercase tracking-[0.4em] text-slate-500">Correct Answer is</h2>
                            <motion.div
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                className="bg-emerald-500 text-slate-900 px-12 py-6 rounded-[2rem] inline-block shadow-[0_0_80px_rgba(16,185,129,0.4)]"
                            >
                                <span className="text-6xl font-black tracking-tight">{currentQuestionData?.correct_option}: {currentQuestionData?.options[['A', 'B', 'C', 'D'].indexOf(currentQuestionData?.correct_option)]}</span>
                            </motion.div>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
                            <div className="w-full grid grid-cols-4 items-end gap-12 h-[400px]">
                                {['A', 'B', 'C', 'D'].map((letter, i) => {
                                    const statValue = (answerStats as any)[letter] || 0;
                                    const percentage = answerStats.total > 0 ? (statValue / answerStats.total) * 100 : 0;
                                    const isCorrect = currentQuestionData?.correct_option === letter;

                                    return (
                                        <div key={letter} className="flex flex-col items-center gap-6 h-full justify-end">
                                            <div className="text-3xl font-black">{statValue}</div>
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${Math.max(10, percentage)}%` }}
                                                transition={{ type: 'spring', damping: 20 }}
                                                className={cn(
                                                    "w-full rounded-t-[2.5rem] relative overflow-hidden flex flex-col items-center justify-center min-h-[40px]",
                                                    isCorrect ? "bg-emerald-500" : "bg-white/10"
                                                )}
                                            >
                                                {isCorrect && <Sparkles className="absolute top-4 w-8 h-8 text-white/40 animate-pulse" />}
                                            </motion.div>
                                            <div className={cn(
                                                "w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black border-4",
                                                isCorrect ? "bg-emerald-500 text-slate-900 border-white" : "bg-white/5 border-white/10 text-slate-500"
                                            )}>
                                                {letter}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="mt-16 text-slate-500 text-xl font-bold uppercase tracking-widest">{answerStats.total} total answers received</p>
                        </div>
                    </div>
                )}

                {/* 5. LEADERBOARD STATE */}
                {gameState === 'leaderboard' && (
                    <div className="flex-1 flex flex-col animate-in fade-in duration-1000">
                        <div className="flex items-center gap-6 mb-16">
                            <Trophy className="w-20 h-20 text-yellow-500" />
                            <h1 className="text-7xl font-black tracking-tighter italic uppercase">Leaderboard</h1>
                        </div>

                        <div className="flex-1 bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-12 overflow-hidden shadow-2xl relative">
                            {/* Add a decorative element */}
                            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] -z-10" />

                            <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-4 custom-scrollbar">
                                {/* Leaderboard rows would ideally be fetched here, for now demoing from local teams sorted by score */}
                                {[...allTeams].sort((a, b) => b.score - a.score).slice(0, 8).map((team, i) => (
                                    <motion.div
                                        key={team.id}
                                        initial={{ x: -100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={cn(
                                            "flex items-center justify-between p-6 rounded-3xl border transition-all duration-300",
                                            i === 0 ? "bg-yellow-500 text-slate-900 border-white scale-105 shadow-2xl" : "bg-white/5 border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-8">
                                            <span className="text-4xl font-black italic min-w-[60px]">#{i + 1}</span>
                                            <span className="text-4xl font-black tracking-tight">{team.team_name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-5xl font-black">{team.score}</span>
                                            <span className="font-bold uppercase tracking-wider text-sm opacity-60">pts</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. FINISHED STATE */}
                {gameState === 'finished' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 10 }}
                            className="bg-yellow-500 p-12 rounded-full shadow-[0_0_100px_rgba(234,179,8,0.3)]"
                        >
                            <Trophy className="w-32 h-32 text-slate-900" />
                        </motion.div>
                        <div className="space-y-4">
                            <h1 className="text-9xl font-black italic uppercase tracking-tighter">Event Finished!</h1>
                            <p className="text-4xl text-slate-400 font-bold tracking-tight">Thank you for playing Quizzila</p>
                        </div>

                        <div className="flex gap-8 mt-12">
                            {/* Podium for top 3 */}
                            {[...allTeams].sort((a, b) => b.score - a.score).slice(0, 3).map((team, i) => (
                                <div key={team.id} className="flex flex-col items-center gap-4">
                                    <div className={cn(
                                        "w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black",
                                        i === 0 ? "bg-yellow-500 text-slate-900" : i === 1 ? "bg-slate-300 text-slate-900" : "bg-orange-600 text-slate-100"
                                    )}>
                                        {i + 1}
                                    </div>
                                    <p className="text-2xl font-black tracking-tight">{team.team_name}</p>
                                    <p className="text-xl font-bold text-slate-500">{team.score} pts</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes count-pump {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                }
                .animate-count-pump {
                    animation: count-pump 1s ease-in-out infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `}</style>
        </div>
    );
}

