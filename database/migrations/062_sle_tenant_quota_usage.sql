-- ============================================================================
-- 062_sle_tenant_quota_usage.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3C (GATE 1 of 5)
-- ============================================================================
-- Per-tenant resource usage counters + per-tenant limit override (Rev #2/#6).
-- resource_key is validated against resource_definitions (048). max_override
-- lets trial approval / provisioning raise a limit WITHOUT a new package.
--
-- SoT direction (Rev #13): Tenant → Subscription → Package. This table holds
-- USAGE + optional per-tenant override; base limits live on the package.
--
-- ADDITIVE · IDEMPOTENT · depends on tenants (exists) + resource_definitions (048).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.tenant_quota_usage (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    resource_key  VARCHAR(50) NOT NULL REFERENCES public.resource_definitions(resource_key) ON DELETE RESTRICT,
    current_value INTEGER NOT NULL DEFAULT 0,
    max_override  INTEGER,   -- NULL = use package limit; set = per-tenant override
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, resource_key)
);

COMMENT ON TABLE public.tenant_quota_usage IS 'Per-tenant usage counters + optional max_override. Base limits come from the package (Tenant→Subscription→Package SoT). Supersedes legacy tenant_quotas.';
COMMENT ON COLUMN public.tenant_quota_usage.max_override IS 'Per-tenant limit override (trial/provisioning). NULL = fall back to package resource_limits.';

CREATE INDEX IF NOT EXISTS idx_tenant_quota_usage_tenant ON public.tenant_quota_usage (tenant_id);

ALTER TABLE public.tenant_quota_usage ENABLE ROW LEVEL SECURITY;

-- Tenant users read their own usage; super_admin all. Writes go through the
-- quota engine (super_admin or tenant-scoped server logic).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_quota_usage' AND policyname = 'tenant_quota_usage_select') THEN
        CREATE POLICY tenant_quota_usage_select ON public.tenant_quota_usage
            FOR SELECT USING (public.is_super_admin() OR public.has_tenant_access(tenant_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_quota_usage' AND policyname = 'tenant_quota_usage_write') THEN
        CREATE POLICY tenant_quota_usage_write ON public.tenant_quota_usage
            FOR ALL USING (public.is_super_admin() OR public.has_tenant_access(tenant_id))
            WITH CHECK (public.is_super_admin() OR public.has_tenant_access(tenant_id));
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.tenant_quota_usage CASCADE; COMMIT;
-- ============================================================================
