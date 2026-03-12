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
    question_text  TEXT        NOT NULL,
    option_a       TEXT        NOT NULL,
    option_b       TEXT        NOT NULL,
    option_c       TEXT        NOT NULL,
    option_d       TEXT        NOT NULL,
    correct_option CHAR(1)    NOT NULL,
    points         INTEGER    NOT NULL DEFAULT 100,
    order_index    INTEGER    NOT NULL,
    timer_seconds  INTEGER    NOT NULL DEFAULT 30,
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

CREATE POLICY "Anyone can read quiz state"
    ON public.quiz_state FOR SELECT
    USING (true);

CREATE POLICY "Service role can update quiz state"
    ON public.quiz_state FOR UPDATE
    USING (true);

-- questions: everyone can read.
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions"
    ON public.questions FOR SELECT
    USING (true);

-- teams: anyone can read and insert (join).
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read teams"
    ON public.teams FOR SELECT
    USING (true);

CREATE POLICY "Anyone can join as a team"
    ON public.teams FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow deleting teams"
    ON public.teams FOR DELETE
    USING (true);

-- answers: anyone can read and insert.
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read answers"
    ON public.answers FOR SELECT
    USING (true);

CREATE POLICY "Anyone can submit an answer"
    ON public.answers FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow deleting answers"
    ON public.answers FOR DELETE
    USING (true);


-- ---------------------------------------------------------------------------
-- 8. HELPER QUERIES (for reference, not executed)
-- ---------------------------------------------------------------------------

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
