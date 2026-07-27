-- ============================================================================
-- 065_sle_scheduler_runs.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3C (GATE 4 of 5)
-- ============================================================================
-- Scheduler Registry run log (Rev #9 / Vercel Cron). Provides IDEMPOTENCY
-- (UNIQUE job_key + run_date) and observability for /platform/scheduler.
--
-- ADDITIVE · IDEMPOTENT · no FK (platform-internal). New table.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.scheduler_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_key         VARCHAR(100) NOT NULL,   -- subscription_sweep | reminder_dispatch | autorenew | ...
    run_date        DATE NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    status          VARCHAR(15) NOT NULL DEFAULT 'running'
                        CHECK (status IN ('running','completed','failed')),
    processed_count INTEGER NOT NULL DEFAULT 0,
    errors          JSONB NOT NULL DEFAULT '[]',

    -- Idempotency gate: one run per job per day.
    UNIQUE (job_key, run_date)
);

COMMENT ON TABLE public.scheduler_runs IS 'Cron job run log. UNIQUE(job_key, run_date) enforces at-least-once idempotency. Observability for /platform/scheduler.';

CREATE INDEX IF NOT EXISTS idx_scheduler_runs_job ON public.scheduler_runs (job_key, run_date DESC);

ALTER TABLE public.scheduler_runs ENABLE ROW LEVEL SECURITY;

-- Platform-only. Cron handlers run with the service role (bypasses RLS);
-- super_admin may read for observability.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduler_runs' AND policyname = 'scheduler_runs_select') THEN
        CREATE POLICY scheduler_runs_select ON public.scheduler_runs
            FOR SELECT USING (public.is_super_admin());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduler_runs' AND policyname = 'scheduler_runs_write') THEN
        CREATE POLICY scheduler_runs_write ON public.scheduler_runs
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.scheduler_runs CASCADE; COMMIT;
-- ============================================================================
