-- =============================================================================
-- QUIZZILA: Production Database Schema
-- =============================================================================
-- Designed for Supabase (PostgreSQL)
-- Optimized for ~120 concurrent teams in a live auditorium quiz event
-- Run this entire file in the Supabase SQL Editor
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ---------------------------------------------------------------------------
-- 1. ENUM: Quiz Status
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_status') THEN
        CREATE TYPE quiz_status AS ENUM (
            'waiting',
            'question_active',
            'leaderboard',
            'finished'
        );
    END IF;
END
$$;


-- ---------------------------------------------------------------------------
-- 2. TABLE: questions
-- ---------------------------------------------------------------------------
-- Stores the full question bank. Order is explicit via order_index.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    text           TEXT        NOT NULL,
    options        JSONB       NOT NULL, -- Array of strings
    correct_option CHAR(1)     NOT NULL,
    order_index    INTEGER     NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_correct_option CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    CONSTRAINT uq_order_index     UNIQUE (order_index)
);

CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions (order_index);

COMMENT ON TABLE public.questions IS 'Quiz question bank with ordering, options, and point values.';


-- ---------------------------------------------------------------------------
-- 3. TABLE: teams
-- ---------------------------------------------------------------------------
-- Each row = one team joining from exactly one device.
-- device_id is generated on the frontend (stored in localStorage) to
-- prevent duplicate joins on page refresh.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name   TEXT    NOT NULL UNIQUE,
    member1     TEXT    NOT NULL,
    member2     TEXT,
    member3     TEXT,
    member4     TEXT,
    device_id   TEXT    NOT NULL,
    score       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_score ON public.teams (score DESC);

COMMENT ON TABLE public.teams IS 'Registered teams. 1 device = 1 team.';


-- ---------------------------------------------------------------------------
-- 4. TABLE: answers
-- ---------------------------------------------------------------------------
-- Stores every submitted answer. The UNIQUE constraint on
-- (team_id, question_id) prevents a team from answering the same
-- question twice.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.answers (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID        NOT NULL REFERENCES public.teams(id)     ON DELETE CASCADE,
    question_id     UUID        NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option CHAR(1)     NOT NULL,
    is_correct      BOOLEAN     NOT NULL,
    points_awarded  INTEGER     NOT NULL DEFAULT 0,
    answered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_team_question   UNIQUE (team_id, question_id),
    CONSTRAINT chk_selected_option CHECK (selected_option IN ('A', 'B', 'C', 'D'))
);

CREATE INDEX IF NOT EXISTS idx_answers_question ON public.answers (question_id);
CREATE INDEX IF NOT EXISTS idx_answers_team     ON public.answers (team_id);

COMMENT ON TABLE public.answers IS 'Submitted answers. One answer per team per question.';


-- ---------------------------------------------------------------------------
-- 5. TABLE: quiz_state
-- ---------------------------------------------------------------------------
-- Single-row table that acts as the global state machine for the quiz.
-- The admin dashboard reads and writes to this table.
-- All participants subscribe to real-time changes on this table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_state (
    id                INTEGER      PRIMARY KEY,
    status            quiz_status  NOT NULL DEFAULT 'waiting',
    current_question  INTEGER      NOT NULL DEFAULT 0,
    timer_end         TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Seed the single control row
INSERT INTO public.quiz_state (id, status, current_question)
VALUES (1, 'waiting', 0)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.quiz_state IS 'Single-row quiz state machine. Controls the entire quiz flow.';


-- ---------------------------------------------------------------------------
-- 6. SUPABASE REALTIME
-- ---------------------------------------------------------------------------
-- Enable full replica identity so Supabase Realtime broadcasts
-- the complete row on every UPDATE (not just the changed columns).
-- ---------------------------------------------------------------------------
ALTER TABLE public.quiz_state REPLICA IDENTITY FULL;
ALTER TABLE public.teams      REPLICA IDENTITY FULL;
ALTER TABLE public.answers    REPLICA IDENTITY FULL;

-- Publish these tables to the Supabase Realtime channel.
-- If the publication already exists, add the tables to it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime FOR TABLE
            public.quiz_state,
            public.teams,
            public.answers;
    ELSE
        -- Safely add each table (ignore if already a member)
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_state;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END
$$;


-- ---------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------
-- Enable RLS on every table. Policies below use the anon key so that
-- participants (unauthenticated) can join, answer, and read state,
-- while destructive mutations are restricted.
-- ---------------------------------------------------------------------------

-- quiz_state: everyone can read; only service_role can write.
ALTER TABLE public.quiz_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read quiz state" ON public.quiz_state;
CREATE POLICY "Anyone can read quiz state"
    ON public.quiz_state FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Service role can update quiz state" ON public.quiz_state;
CREATE POLICY "Service role can update quiz state"
    ON public.quiz_state FOR UPDATE
    USING (true);

-- questions: everyone can read.
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read questions" ON public.questions;
CREATE POLICY "Anyone can read questions"
    ON public.questions FOR SELECT
    USING (true);

-- teams: anyone can read and insert (join).
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read teams" ON public.teams;
CREATE POLICY "Anyone can read teams"
    ON public.teams FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can join as a team" ON public.teams;
CREATE POLICY "Anyone can join as a team"
    ON public.teams FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow deleting teams" ON public.teams;
CREATE POLICY "Allow deleting teams"
    ON public.teams FOR DELETE
    USING (true);

-- answers: anyone can read and insert.
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read answers" ON public.answers;
CREATE POLICY "Anyone can read answers"
    ON public.answers FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can submit an answer" ON public.answers;
CREATE POLICY "Anyone can submit an answer"
    ON public.answers FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow deleting answers" ON public.answers;
CREATE POLICY "Allow deleting answers"
    ON public.answers FOR DELETE
    USING (true);


-- ---------------------------------------------------------------------------
-- 8. HELPER FUNCTIONS
-- ---------------------------------------------------------------------------

-- Atomic increment for team score to prevent race conditions during live events
CREATE OR REPLACE FUNCTION public.increment_team_score(t_id UUID, points_to_add INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.teams
    SET score = score + points_to_add
    WHERE id = t_id;
END;
$$;

-- Atomic answer submission with score update to prevent race conditions
-- This handles both inserting the answer and updating the score in a single transaction
CREATE OR REPLACE FUNCTION public.submit_answer_atomic(
    p_team_id UUID,
    p_question_id UUID,
    p_selected_option TEXT,
    p_is_correct BOOLEAN,
    p_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_answer_id UUID;
    result JSONB;
BEGIN
    -- Insert answer and get the new ID
    INSERT INTO public.answers (team_id, question_id, selected_option, is_correct, points_awarded)
    VALUES (p_team_id, p_question_id, p_selected_option, p_is_correct, p_points)
    RETURNING id INTO new_answer_id;
    
    -- Update score atomically if points were awarded
    IF p_points > 0 THEN
        UPDATE public.teams
        SET score = score + p_points
        WHERE id = p_team_id;
    END IF;
    
    -- Return the result
    result := jsonb_build_object(
        'answer_id', new_answer_id,
        'points_awarded', p_points,
        'is_correct', p_is_correct
    );
    
    RETURN result;
END;
$$;

-- Secure answer submission: server-side correctness validation
-- This prevents clients from sending fake is_correct values
CREATE OR REPLACE FUNCTION public.submit_answer_secure(
    p_team_id UUID,
    p_question_id UUID,
    p_selected_option TEXT,
    p_time_remaining INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    correct_opt CHAR(1);
    is_correct BOOLEAN;
    points INTEGER;
    base_points INTEGER := 100;
    new_answer_id UUID;
    result JSONB;
BEGIN
    -- Get correct option from question
    SELECT correct_option INTO correct_opt
    FROM public.questions
    WHERE id = p_question_id;

    IF correct_opt IS NULL THEN
        RAISE EXCEPTION 'Question not found';
    END IF;

    -- Compute correctness server-side
    is_correct := UPPER(p_selected_option) = correct_opt;

    -- Calculate FFF points (Fastest Finger First)
    IF is_correct THEN
        points := base_points + FLOOR((GREATEST(0, p_time_remaining) / 30.0) * base_points);
    ELSE
        points := 0;
    END IF;

    -- Insert answer
    INSERT INTO public.answers (team_id, question_id, selected_option, is_correct, points_awarded)
    VALUES (p_team_id, p_question_id, UPPER(p_selected_option), is_correct, points)
    RETURNING id INTO new_answer_id;

    -- Update score if correct
    IF points > 0 THEN
        UPDATE public.teams
        SET score = score + points
        WHERE id = p_team_id;
    END IF;

    -- Return the result
    result := jsonb_build_object(
        'answer_id', new_answer_id,
        'points_awarded', points,
        'is_correct', is_correct
    );

    RETURN result;
END;
$$;

-- Secure question getter: only reveals answer during reveal state
CREATE OR REPLACE FUNCTION public.get_current_question_secure()
RETURNS TABLE(
    id UUID,
    text TEXT,
    options JSONB,
    correct_option CHAR(1),
    order_index INTEGER,
    status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_q_index INTEGER;
    current_status VARCHAR;
BEGIN
    -- Get current question index and status
    SELECT q.current_question, q.status INTO current_q_index, current_status
    FROM public.quiz_state q WHERE q.id = 1;

    RETURN QUERY
    SELECT
        q.id,
        q.text,
        q.options,
        CASE
            WHEN current_status IN ('answer_reveal', 'leaderboard', 'finished') THEN q.correct_option
            ELSE NULL::CHAR(1)
        END,
        q.order_index,
        current_status
    FROM public.questions q
    WHERE q.order_index = current_q_index;
END;
$$;

-- RESET SESSION (run from admin dashboard)
-- DELETE FROM public.answers;
-- DELETE FROM public.teams;
-- UPDATE public.quiz_state SET status = 'waiting', current_question = 0, timer_end = NULL, updated_at = now() WHERE id = 1;

-- LEADERBOARD
-- SELECT team_name, score FROM public.teams ORDER BY score DESC;

-- GET CURRENT QUESTION
-- SELECT * FROM public.questions WHERE order_index = (SELECT current_question FROM public.quiz_state WHERE id = 1);


-- =============================================================================
-- SCHEMA COMPLETE
-- =============================================================================
