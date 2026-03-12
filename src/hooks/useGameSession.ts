import { useState, useEffect, useCallback } from "react";
import { sessionService } from "@/services/sessionService";
import { type GameSession } from "@/data/session";

export function useGameSession() {
    const [gameState, setGameState] = useState<"entry" | "lobby" | "countdown" | "quiz" | "leaderboard" | "finished">("entry");
    const [currentQue, setCurrentQue] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [isInitialized, setIsInitialized] = useState(false);

    // --- Real-time Sync Logic ---
    const handleSessionUpdate = useCallback((session: GameSession) => {
        setCurrentQue(session.current_question_index);

        if (session.status === 'LOBBY') setGameState('lobby');
        if (session.status === 'COUNTDOWN') setGameState('countdown');
        if (session.status === 'QUESTION') {
            setGameState('quiz');

            // Calculate remaining time based on server start time
            if (session.timer_start) {
                const startTime = new Date(session.timer_start).getTime();
                const now = new Date().getTime();
                const diff = Math.floor((now - startTime) / 1000);
                const remaining = Math.max(0, 30 - diff);
                setTimeLeft(remaining);
            } else {
                setTimeLeft(30);
            }
        }
        if (session.status === 'FINISHED') setGameState('finished');
    }, []);

    useEffect(() => {
        // 1. Fetch initial state
        sessionService.getSession().then((session) => {
            if (session) {
                handleSessionUpdate(session);
                setIsInitialized(true);
            }
        });

        // 2. Subscribe to real-time updates
        const subscription = sessionService.subscribeToUpdates(handleSessionUpdate);

        return () => {
            subscription.unsubscribe();
        };
    }, [handleSessionUpdate]);

    // --- Timer Logic (Local Ticking) ---
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (gameState === "quiz" && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft]);

    return {
        gameState,
        setGameState,
        currentQue,
        timeLeft,
        setTimeLeft,
        isInitialized
    };
}
