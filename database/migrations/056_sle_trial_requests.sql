-- ============================================================================
-- 056_sle_trial_requests.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3A (GATE 5 of 5)
-- ============================================================================
-- Trial intake queue (Rev #2 lifecycle: pending → reviewing → approved →
-- (provisioning) → rejected). Super Admin reviews and, on approval, may
-- override duration & resource limits WITHOUT creating a new package
-- (approved_duration_days + approved_resource_overrides → tenant_quota_usage
-- max_override at provisioning).
--
-- PUBLIC SUBMISSION: the public trial form writes via a server route using the
-- service role (bypasses RLS). RLS here is therefore super_admin-only; there is
-- NO anon policy (avoids exposing the queue).
--
-- ADDITIVE · IDEMPOTENT · FKs reference existing tables only.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.trial_requests (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_name              VARCHAR(200) NOT NULL,
    email                       VARCHAR(200) NOT NULL,
    phone                       VARCHAR(30),
    pharmacy_name               VARCHAR(200) NOT NULL,
    requested_plan_id           UUID REFERENCES public.tenant_packages(id) ON DELETE SET NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','reviewing','approved','rejected')),
    reviewed_by                 UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at                 TIMESTAMPTZ,
    reject_reason               TEXT,
    assigned_tenant_id          UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    approved_duration_days      INTEGER,
    approved_resource_overrides JSONB NOT NULL DEFAULT '{}',
    metadata                    JSONB NOT NULL DEFAULT '{}',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.trial_requests IS 'Trial intake queue. Lifecycle: pending→reviewing→approved→rejected. Approval may override duration/limits without a new package.';
COMMENT ON COLUMN public.trial_requests.approved_duration_days IS 'Overrides trial.default_duration_days at approval; NULL = use config default.';
COMMENT ON COLUMN public.trial_requests.approved_resource_overrides IS 'Per-resource limit overrides applied to tenant_quota_usage.max_override at provisioning.';
COMMENT ON COLUMN public.trial_requests.assigned_tenant_id IS 'Tenant created on approval/provisioning; NULL until provisioned.';

CREATE INDEX IF NOT EXISTS idx_trial_requests_status ON public.trial_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trial_requests_email  ON public.trial_requests (email);

ALTER TABLE public.trial_requests ENABLE ROW LEVEL SECURITY;

-- Super-admin-only. Public submissions go through a service-role server route.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trial_requests' AND policyname = 'trial_requests_select') THEN
        CREATE POLICY trial_requests_select ON public.trial_requests
            FOR SELECT USING (public.is_super_admin());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trial_requests' AND policyname = 'trial_requests_write') THEN
        CREATE POLICY trial_requests_write ON public.trial_requests
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.trial_requests CASCADE; COMMIT;
-- ============================================================================
