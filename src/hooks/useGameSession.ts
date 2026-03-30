import { useState, useEffect, useCallback, useRef } from "react";
import { sessionService } from "@/services/sessionService";
import { supabase } from "@/lib/supabase";
import { type QuizState, type QuizStatus, type Question, type Team, type AnswerStats } from "@/data/session";

export type ClientGameState = "entry" | "register" | "lobby" | "countdown" | "quiz" | "reveal" | "leaderboard" | "finished";

export function useGameSession() {
    const [gameState, setGameState] = useState<ClientGameState>("entry");
    const [quizStatus, setQuizStatus] = useState<QuizStatus>("waiting");
    const [currentQue, setCurrentQue] = useState(0);
    const [stepNumber, setStepNumber] = useState(1);
    const [currentQuestionData, setCurrentQuestionData] = useState<Question | null>(null);
    const [timeLeft, setTimeLeft] = useState(30);
    const [teamCount, setTeamCount] = useState(0);
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [answerStats, setAnswerStats] = useState<AnswerStats>({ A: 0, B: 0, C: 0, D: 0, total: 0 });
    const [isInitialized, setIsInitialized] = useState(false);

    // --- Real-time Sync Logic ---
    // Use ref for stable callback reference to prevent re-subscriptions
    const currentQuestionDataRef = useRef<Question | null>(null);

    // Sync ref with state (in effect to avoid render-phase update)
    useEffect(() => {
        currentQuestionDataRef.current = currentQuestionData;
    }, [currentQuestionData]);

    const handleStateUpdate = useCallback((state: QuizState) => {
        setQuizStatus(state.status);
        setCurrentQue(state.current_question);
        if (state.step_number !== undefined) {
            setStepNumber(state.step_number);
        }

        // Map database status to client state
        if (state.status === 'waiting') {
            // NEVER auto-transition from entry or register.
            setGameState(prev => {
                if (prev === 'entry' || prev === 'register') return prev;
                return 'lobby';
            });
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
        } else if (state.status === 'answer_reveal') {
            setGameState('reveal');
        } else if (state.status === 'leaderboard') {
            setGameState('leaderboard');
        } else if (state.status === 'finished') {
            setGameState('finished');
        }

        // Fetch question data securely (prevents answer leaks)
        if (state.status === 'question_active' || state.status === 'answer_reveal') {
            sessionService.getCurrentQuestionSecure().then((qData) => {
                setCurrentQuestionData(qData);
                if (qData?.id) {
                    sessionService.getAnswerStats(qData.id).then(setAnswerStats);
                }
            });
        } else {
            setCurrentQuestionData(null);
            setAnswerStats({ A: 0, B: 0, C: 0, D: 0, total: 0 });
        }
    }, []);

    useEffect(() => {
        sessionService.getQuizState().then((state) => {
            if (state) {
                handleStateUpdate(state);
            }
        });

        // 1.1 Fetch team count
        sessionService.getTeamCount().then((count) => {
            setTeamCount(count);
            setIsInitialized(true);
        });

        // 2. Subscribe to real-time updates
        const stateSub = sessionService.subscribeToState(handleStateUpdate);

        // 2.0 Fetch all teams
        sessionService.getTeams().then(setAllTeams);
        const allTeamsSub = sessionService.subscribeToTeams((newTeam) => {
            setAllTeams(prev => [...prev, newTeam]);
        });

        // 2.1 Subscribe to team updates
        const teamSub = sessionService.subscribeToTeams(() => {
            sessionService.getTeamCount().then(setTeamCount);
        });

        // 2.2 Subscribe to team removals (for reset)
        const teamDeleteSub = supabase
            .channel('teams-delete-channel')
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'teams' }, () => {
                sessionService.getTeamCount().then(setTeamCount);
                sessionService.getTeams().then(setAllTeams);
            })
            .subscribe();

        // 2.3 Subscribe to answers for live stats
        const answersSub = sessionService.subscribeToAnswers(() => {
            // Re-fetch stats when a new answer comes in - use ref to get fresh question data
            const qData = currentQuestionDataRef.current;
            if (qData?.id) {
                sessionService.getAnswerStats(qData.id).then(setAnswerStats);
            }
        });

        return () => {
            stateSub.unsubscribe();
            allTeamsSub.unsubscribe();
            teamSub.unsubscribe();
            teamDeleteSub.unsubscribe();
            answersSub.unsubscribe();
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
        quizStatus,
        setGameState,
        currentQue,
        stepNumber,
        currentQuestionData,
        timeLeft,
        setTimeLeft,
        teamCount,
        allTeams,
        answerStats,
        isInitialized
    };
}
