import { supabase } from "@/lib/supabase";
import { type GameSession } from "@/data/session";

export const SESSION_ID = 'active-session';

export const sessionService = {
    /**
     * Fetch the current active session
     */
    async getSession(): Promise<GameSession | null> {
        const { data, error } = await supabase
            .from('game_sessions')
            .select('*')
            .eq('id', SESSION_ID)
            .single();

        if (error) {
            console.error('Error fetching session:', error);
            return null;
        }
        return data as GameSession;
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
