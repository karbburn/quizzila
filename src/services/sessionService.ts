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
     * Start Question directly (no countdown, legacy)
     */
    async startQuestion(index: number) {
        const timerEnd = new Date();
        timerEnd.setSeconds(timerEnd.getSeconds() + 30); // 30 seconds to answer

        return this.updateQuizState({
            status: 'question_active',
            current_question: index,
            timer_end: timerEnd.toISOString(),
            step_number: index + 1 // Default fallback
        });
    },

    /**
     * Transition to Countdown (with anticipation timer)
     */
    async startCountdown(targetQuestionIndex: number, stepNumber: number, durationSeconds: number = 3) {
        const timerEnd = new Date();
        timerEnd.setSeconds(timerEnd.getSeconds() + durationSeconds);

        return this.updateQuizState({
            status: 'countdown',
            current_question: targetQuestionIndex,
            step_number: stepNumber,
            timer_end: timerEnd.toISOString()
        });
    },

    /**
     * Activate previously countdown-ed question
     */
    async activateQuestion() {
        const timerEnd = new Date();
        timerEnd.setSeconds(timerEnd.getSeconds() + 30); // 30 seconds to answer

        // Maintain current_question and step_number, just change status and timer
        return this.updateQuizState({
            status: 'question_active',
            timer_end: timerEnd.toISOString()
        });
    },

    /**
     * Reveal the answer for the current question
     */
    async revealAnswer() {
        return this.updateQuizState({
            status: 'answer_reveal'
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
        const { error: answersError } = await supabase.from('answers').delete().gte('points_awarded', 0);
        const { error: teamsError } = await supabase.from('teams').delete().not('id', 'is', null);

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

        const mappedQuestions = questions.map((q, i) => {
            let ans = String(q.answer || '').trim().toUpperCase();
            let finalAns = 'A';

            if (/^[A-D]$/.test(ans)) {
                finalAns = ans;
            } else if (/^[1-4]$/.test(ans)) {
                finalAns = String.fromCharCode(64 + parseInt(ans));
            } else if (Array.isArray(q.options)) {
                // Try to find if the answer text matches any option text
                const idx = q.options.findIndex((opt: string) =>
                    String(opt).toLowerCase().includes(ans.toLowerCase())
                );
                if (idx >= 0 && idx < 4) finalAns = String.fromCharCode(65 + idx);
            }

            return {
                order_index: i,
                text: q.question,
                correct_option: finalAns,
                options: q.options
            };
        });

        const { error } = await supabase
            .from('questions')
            .insert(mappedQuestions);

        if (error) {
            console.error('Error bulk importing questions:', error.message);
            throw error;
        }
    },

    // ── Timer Controls ─────────────────────────────────────────────

    /**
     * Extend the current timer by N seconds
     */
    async extendTimer(seconds: number) {
        const state = await this.getQuizState();
        if (!state?.timer_end) return;
        const current = new Date(state.timer_end);
        current.setSeconds(current.getSeconds() + seconds);
        return this.updateQuizState({ timer_end: current.toISOString() });
    },

    /**
     * Pause the timer by storing the remaining time in a way the frontend
     * interprets as "paused" (timer_end far in the future).
     * Returns remaining seconds so we can resume later.
     */
    async pauseTimer(): Promise<number> {
        const state = await this.getQuizState();
        if (!state?.timer_end) return 0;
        const remaining = Math.max(0, Math.floor((new Date(state.timer_end).getTime() - Date.now()) / 1000));
        // Set timer_end to null to signal "paused" to frontend
        await this.updateQuizState({ timer_end: null });
        return remaining;
    },

    /**
     * Resume the timer with a given number of remaining seconds
     */
    async resumeTimer(remainingSeconds: number) {
        const timerEnd = new Date();
        timerEnd.setSeconds(timerEnd.getSeconds() + remainingSeconds);
        return this.updateQuizState({ timer_end: timerEnd.toISOString() });
    },

    // ── Live Answer Stats ──────────────────────────────────────────

    /**
     * Get answer counts (A/B/C/D) for a specific question
     */
    async getAnswerStats(questionId: string): Promise<{ A: number; B: number; C: number; D: number; total: number }> {
        const { data, error } = await supabase
            .from('answers')
            .select('selected_option')
            .eq('question_id', questionId);

        if (error || !data) return { A: 0, B: 0, C: 0, D: 0, total: 0 };

        const stats = { A: 0, B: 0, C: 0, D: 0, total: data.length };
        data.forEach((row: any) => {
            const opt = row.selected_option as 'A' | 'B' | 'C' | 'D';
            if (stats.hasOwnProperty(opt)) stats[opt]++;
        });
        return stats;
    },

    /**
     * Subscribe to live answer submissions
     */
    subscribeToAnswers(onInsert: (answer: Answer) => void) {
        return supabase
            .channel('answers-channel')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'answers' },
                (payload) => {
                    onInsert(payload.new as Answer);
                }
            )
            .subscribe();
    },

    /**
     * Subscribe to team joins
     */
    subscribeToTeams(onInsert: (team: Team) => void) {
        return supabase
            .channel('teams-channel')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'teams' },
                (payload) => {
                    onInsert(payload.new as Team);
                }
            )
            .subscribe();
    },

    // ── Leaderboard ────────────────────────────────────────────────

    /**
     * Get leaderboard (top N teams by score)
     */
    async getLeaderboard(limit: number = 10): Promise<{ team_name: string; score: number; rank: number }[]> {
        const { data, error } = await supabase
            .from('teams')
            .select('team_name, score')
            .order('score', { ascending: false })
            .limit(limit);

        if (error || !data) return [];
        return data.map((t: any, i: number) => ({ team_name: t.team_name, score: t.score, rank: i + 1 }));
    },

    /**
     * Get total registered team count
     */
    async getTeamCount(): Promise<number> {
        const { count, error } = await supabase
            .from('teams')
            .select('*', { count: 'exact', head: true });
        if (error) return 0;
        return count ?? 0;
    },

    // ── Question CRUD ──────────────────────────────────────────────

    /**
     * Add a single question
     */
    async addQuestion(q: { text: string; options: string[]; correct_option: string; order_index: number }) {
        const { error } = await supabase.from('questions').insert([q]);
        if (error) throw error;
    },

    /**
     * Update a question
     */
    async updateQuestion(id: string, updates: Partial<{ text: string; options: string[]; correct_option: string; order_index: number }>) {
        const { error } = await supabase.from('questions').update(updates).eq('id', id);
        if (error) throw error;
    },

    /**
     * Delete a question
     */
    async deleteQuestion(id: string) {
        const { error } = await supabase.from('questions').delete().eq('id', id);
        if (error) throw error;
    },

    /**
     * Get all questions ordered (Admin only - includes correct_option)
     */
    async getQuestions() {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .order('order_index', { ascending: true });
        if (error) return [];
        return data ?? [];
    },

    /**
     * Get the current question securely (Participant - hides answer if not reveal state)
     */
    async getCurrentQuestionSecure(): Promise<any | null> {
        const { data, error } = await supabase.rpc('get_current_question_secure');
        if (error || !data || data.length === 0) return null;
        return data[0];
    },

    /**
     * Check if team already answered a question (for refresh protection)
     */
    async hasAnswered(teamId: string, questionId: string): Promise<boolean> {
        const { data } = await supabase
            .from('answers')
            .select('id')
            .eq('team_id', teamId)
            .eq('question_id', questionId)
            .maybeSingle();
        return !!data;
    },

    /**
     * Verify if a team still exists in the database (used for reset protection)
     */
    async isTeamValid(teamId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('teams')
            .select('id')
            .eq('id', teamId)
            .maybeSingle();

        return !!data && !error;
    },

    /**
     * Check if a team name is already taken (for registration validation)
     */
    async isTeamNameTaken(name: string): Promise<boolean> {
        if (!name.trim()) return false;
        const { data } = await supabase
            .from('teams')
            .select('id')
            .eq('team_name', name.trim())
            .maybeSingle();
        return !!data;
    },

    /**
     * Get all currently registered teams
     */
    async getTeams(): Promise<Team[]> {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) return [];
        return data ?? [];
    }
};
