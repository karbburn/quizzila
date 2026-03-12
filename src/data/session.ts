export type QuizStatus = 'waiting' | 'countdown' | 'question_active' | 'leaderboard' | 'finished';

export interface QuizState {
    id: number;
    status: QuizStatus;
    current_question: number; // order_index of the question
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
