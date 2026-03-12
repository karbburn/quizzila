import { useState, useEffect, useCallback } from "react";
import { sessionService } from "@/services/sessionService";
import { type QuizState, type QuizStatus } from "@/data/session";

export type ClientGameState = "entry" | "lobby" | "countdown" | "quiz" | "leaderboard" | "finished";

export function useGameSession() {
    const [gameState, setGameState] = useState<ClientGameState>("entry");
    const [currentQue, setCurrentQue] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [isInitialized, setIsInitialized] = useState(false);

    // --- Real-time Sync Logic ---
    const handleStateUpdate = useCallback((state: QuizState) => {
        setCurrentQue(state.current_question);

        // Map database status to client state
        if (state.status === 'waiting') {
            setGameState('lobby');
        } else if (state.status === 'countdown') {
            setGameState('countdown');
            if (state.timer_end) {
                const endTime = new Date(state.timer_end).getTime();
                const now = new Date().getTime();
                const diff = Math.floor((endTime - now) / 1000);
                setTimeLeft(Math.max(0, diff));
            }
        } else if (state.status === 'question_active') {
            setGameState('quiz');

            if (state.timer_end) {
                const endTime = new Date(state.timer_end).getTime();
                const now = new Date().getTime();
                const diff = Math.floor((endTime - now) / 1000);
                setTimeLeft(Math.max(0, diff));
            } else {
                setTimeLeft(30);
            }
        } else if (state.status === 'leaderboard') {
            setGameState('leaderboard');
        } else if (state.status === 'finished') {
            setGameState('finished');
        }
    }, []);

    useEffect(() => {
        // 1. Fetch initial state
        sessionService.getQuizState().then((state) => {
            if (state) {
                handleStateUpdate(state);
                setIsInitialized(true);
            }
        });

        // 2. Subscribe to real-time updates
        const subscription = sessionService.subscribeToState(handleStateUpdate);

        return () => {
            subscription.unsubscribe();
        };
    }, [handleStateUpdate]);

    // --- Timer Logic (Local Ticking) ---
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if ((gameState === "quiz" || gameState === "countdown") && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => Math.max(0, prev - 1));
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
