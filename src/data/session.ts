import { initialQuestions, type Question } from "@/data/questions";

export interface GameSession {
    id: string;
    current_question_index: number;
    status: 'LOBBY' | 'QUESTION' | 'LEADERBOARD' | 'FINISHED';
    timer_start: string | null; // ISO timestamp
}
