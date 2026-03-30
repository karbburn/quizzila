export type QuizStatus = 'waiting' | 'countdown' | 'question_active' | 'question_locked' | 'answer_reveal' | 'leaderboard' | 'finished';

export interface QuizState {
    id: number;
    status: QuizStatus;
    current_question: number; // order_index of the question
    step_number: number;      // Presentation sequence number
    timer_end: string | null; // ISO timestamp
    updated_at: string;
}

export interface Team {
    id: string;
    team_name: string;
    member1: string;
    member2?: string;
    member3?: string;
    member4?: string;
    device_id: string;
    score: number;
    created_at: string;
}

export interface Answer {
    id: string;
    team_id: string;
    question_id: string;
    selected_option: 'A' | 'B' | 'C' | 'D';
    is_correct: boolean;
    points_awarded: number;
    answered_at: string;
}

export interface Question {
    id: string;
    text: string;
    options: string[];
    correct_option: 'A' | 'B' | 'C' | 'D';
    order_index: number;
}

export interface AnswerStats {
    A: number;
    B: number;
    C: number;
    D: number;
    total: number;
}

export interface LeaderboardEntry {
    team_name: string;
    score: number;
    rank: number;
}

export interface TeamInfo {
    id: string;
    name: string;
}

export interface RegData {
    teamName: string;
    member1: string;
    member2: string;
    member3: string;
    member4: string;
}

export interface RegErrors {
    teamName?: string;
    member1?: string;
}
