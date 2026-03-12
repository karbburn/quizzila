import { supabase } from "@/lib/supabase";
import { type QuizState, type Team, type Answer, type QuizStatus } from "@/data/session";

export const STATE_ID = 1;

export const sessionService = {
    /**
     * Fetch the global quiz state
     */
    async getQuizState(): Promise<QuizState | null> {
        try {
            const { data, error } = await supabase
                .from('quiz_state')
                .select('*')
                .eq('id', STATE_ID)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('Quiz state not found, creating initial row...');
                    const { data: newData, error: createError } = await supabase
                        .from('quiz_state')
                        .insert([{ id: STATE_ID, status: 'waiting', current_question: 0 }])
                        .select()
                        .single();

                    if (createError) {
                        console.error('Failed to create initial quiz state:', createError.message);
                        return null;
                    }
                    return newData as QuizState;
                }
                console.error('Error fetching quiz state:', error.message);
                return null;
            }
            return data as QuizState;
        } catch (err) {
            console.error('Unexpected error in getQuizState:', err);
            return null;
        }
    },

    /**
     * Update the quiz state
     */
    async updateQuizState(updates: Partial<QuizState>) {
        const { error } = await supabase
            .from('quiz_state')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', STATE_ID);

        if (error) {
            console.error('Error updating quiz state:', error.message);
            throw error;
        }
    },

    /**
     * Subscribe to real-time state updates
     */
    subscribeToState(onUpdate: (state: QuizState) => void) {
        return supabase
            .channel('quiz-state-channel')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'quiz_state', filter: `id=eq.${STATE_ID}` },
                (payload) => {
                    onUpdate(payload.new as QuizState);
                }
            )
            .subscribe();
    },

    /**
     * Team Management: Register a new team
     */
    async registerTeam(teamData: Omit<Team, 'id' | 'score' | 'created_at'>): Promise<Team | null> {
        const { data, error } = await supabase
            .from('teams')
            .insert([teamData])
            .select()
            .single();

        if (error) {
            console.error('Error registering team:', error.message);
            return null;
        }
        return data as Team;
    },

    /**
     * Calculate points based on speed (FFF - Fastest Finger First)
     * Max points at 30s remaining is 2x basePoints
     * Min points at 0s remaining is 1x basePoints
     */
    calculateFFFPoints(timeLeft: number, basePoints: number = 100): number {
        const bonus = Math.floor((Math.max(0, timeLeft) / 30) * basePoints);
        return basePoints + bonus;
    },

    /**
     * Submit an answer with FFF points calculation
     */
    async submitAnswer(answerData: Omit<Answer, 'id' | 'answered_at' | 'points_awarded'>, timeLeft: number) {
        const points = answerData.is_correct ? this.calculateFFFPoints(timeLeft) : 0;

        const { error: answerError } = await supabase
            .from('answers')
            .insert([{ ...answerData, points_awarded: points }]);

        if (answerError) {
            console.error('Error submitting answer:', answerError.message);
            throw answerError;
        }

        // If correct, update the team's total score
        if (points > 0) {
            const { error: teamError } = await supabase.rpc('increment_team_score', {
                t_id: answerData.team_id,
                points_to_add: points
            });

            if (teamError) {
                // Fallback if RPC isn't defined yet: fetch and update
                const { data: team } = await supabase.from('teams').select('score').eq('id', answerData.team_id).single();
                if (team) {
                    await supabase.from('teams').update({ score: team.score + points }).eq('id', answerData.team_id);
                }
            }
        }
    },

    /**
     * Start the Quiz at a specific question
     */
    async startQuestion(index: number, durationSeconds: number = 30) {
        const timerEnd = new Date();
        timerEnd.setSeconds(timerEnd.getSeconds() + durationSeconds);

        return this.updateQuizState({
            status: 'question_active',
            current_question: index,
            timer_end: timerEnd.toISOString()
        });
    },

    /**
     * Transition to Countdown
     */
    async startCountdown(durationSeconds: number = 6) {
        const timerEnd = new Date();
        timerEnd.setSeconds(timerEnd.getSeconds() + durationSeconds);

        return this.updateQuizState({
            status: 'countdown',
            timer_end: timerEnd.toISOString()
        });
    },

    /**
     * Show the leaderboard
     */
    async showLeaderboard() {
        return this.updateQuizState({
            status: 'leaderboard'
        });
    },

    /**
     * End the quiz
     */
    async endQuiz() {
        return this.updateQuizState({
            status: 'finished'
        });
    },

    /**
     * Reset the quiz for the admin
     */
    async resetQuiz() {
        const { error: answersError } = await supabase.from('answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { error: teamsError } = await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (answersError) console.error('Error clearing answers:', answersError.message);
        if (teamsError) console.error('Error clearing teams:', teamsError.message);

        return this.updateQuizState({
            status: 'waiting',
            current_question: 0,
            timer_end: null
        });
    },

    /**
     * Bulk Question Import for Admin
     */
    async bulkImportQuestions(questions: any[]) {
        // Clear existing questions
        await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        const mappedQuestions = questions.map(q => ({
            order_index: q.numb,
            text: q.question,
            correct_option: q.answer,
            options: q.options
        }));

        const { error } = await supabase
            .from('questions')
            .insert(mappedQuestions);

        if (error) {
            console.error('Error bulk importing questions:', error.message);
            throw error;
        }
    }
};
