import { supabase } from "@/lib/supabase";
import { type GameSession } from "@/data/session";

export const SESSION_ID = 'active-session';

export const sessionService = {
    /**
     * Fetch the current active session
     */
    async getSession(): Promise<GameSession | null> {
        console.log('Fetching session for ID:', SESSION_ID);
        try {
            const { data, error } = await supabase
                .from('game_sessions')
                .select('*')
                .eq('id', SESSION_ID)
                .single();

            if (error) {
                // PGRST116 means "No rows found" when using .single()
                if (error.code === 'PGRST116') {
                    console.log('Session not found, creating initial row...');
                    const { data: newData, error: createError } = await supabase
                        .from('game_sessions')
                        .insert([{ id: SESSION_ID, status: 'LOBBY', current_question_index: 0 }])
                        .select()
                        .single();

                    if (createError) {
                        console.error('Failed to create initial session:', createError.message);
                        return null;
                    }
                    return newData as GameSession;
                }

                console.error('Error fetching session:', error.message || error);
                return null;
            }
            return data as GameSession;
        } catch (err) {
            console.error('Unexpected error in getSession:', err);
            return null;
        }
    },

    /**
     * Update the session state
     */
    async updateSession(updates: Partial<GameSession>) {
        const { error } = await supabase
            .from('game_sessions')
            .update(updates)
            .eq('id', SESSION_ID);

        if (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    },

    /**
     * Subscribe to real-time session updates
     */
    subscribeToUpdates(onUpdate: (session: GameSession) => void) {
        return supabase
            .channel('live-quiz')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${SESSION_ID}` },
                (payload) => {
                    onUpdate(payload.new as GameSession);
                }
            )
            .subscribe();
    },

    /**
     * Reset the session to Lobby
     */
    async resetSession() {
        return this.updateSession({
            status: 'LOBBY',
            current_question_index: 0,
            timer_start: null
        });
    },

    /**
     * Transition to Countdown
     */
    async startCountdown() {
        return this.updateSession({
            status: 'COUNTDOWN',
            timer_start: new Date().toISOString()
        });
    },

    /**
     * Start the Quiz at a specific question
     */
    async startQuestion(index: number) {
        return this.updateSession({
            status: 'QUESTION',
            current_question_index: index,
            timer_start: new Date().toISOString()
        });
    }
};
