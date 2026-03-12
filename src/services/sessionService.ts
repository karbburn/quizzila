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
     * Submit an answer
     */
    async submitAnswer(answerData: Omit<Answer, 'id' | 'answered_at'>) {
        const { error } = await supabase
            .from('answers')
            .insert([answerData]);

        if (error) {
            console.error('Error submitting answer:', error.message);
            throw error;
        }
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
        // Clear dynamic data (not using uuid gte trick, just delete all)
        // Note: Supabase RLS allows the deletions we configured
        const { error: answersError } = await supabase.from('answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { error: teamsError } = await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (answersError) console.error('Error clearing answers:', answersError.message);
        if (teamsError) console.error('Error clearing teams:', teamsError.message);

        // Reset state
        return this.updateQuizState({
            status: 'waiting',
            current_question: 0,
            timer_end: null
        });
    }
};
