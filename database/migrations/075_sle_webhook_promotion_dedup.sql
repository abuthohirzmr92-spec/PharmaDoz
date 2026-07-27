-- ============================================================================
-- 075_sle_webhook_promotion_dedup.sql
-- CR-003 (APPROVED) — Webhook Dedup + Promotion Redemption Persistence
-- ============================================================================
-- 1. webhook_deliveries — dedup key per (provider, reference). A duplicate
--    webhook delivery is a no-op (recorded, not reprocessed).
-- 2. promotion_redemptions — per-tenant, per-invoice, per-promotion redemption
--    history + enforcement. Replaces the racy read-modify-write counter.
-- 3. RPC increment_promotion_redemption — atomic insert-redemption + increment
--    redeemed_count. One call, one transaction.
--
-- ADDITIVE · IDEMPOTENT · REVERSIBLE (DROP TABLE/FUNCTION) · RLS-enabled
-- ============================================================================

BEGIN;

-- =====================================================================
-- 1. webhook_deliveries — webhook deduplication
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider        VARCHAR(30) NOT NULL,
    reference       VARCHAR(200) NOT NULL,
    event_type      VARCHAR(30) NOT NULL,        -- success | failed | pending
    status          VARCHAR(15) NOT NULL DEFAULT 'received'
                        CHECK (status IN ('received','processed','duplicate','failed')),
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,

    -- Idempotency: one row per (provider, reference). A duplicate webhook
    -- delivery is detected by the UNIQUE constraint and recorded as `duplicate`.
    UNIQUE (provider, reference)
);

COMMENT ON TABLE public.webhook_deliveries IS 'Webhook delivery idempotency log. UNIQUE(provider,reference) prevents duplicate processing.';
COMMENT ON COLUMN public.webhook_deliveries.status IS 'received=acknowledged, processed=applied, duplicate=skipped, failed=error';

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_provider_ref
    ON public.webhook_deliveries (provider, reference);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_received
    ON public.webhook_deliveries (received_at DESC);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_deliveries' AND policyname = 'webhook_deliveries_select') THEN
        CREATE POLICY webhook_deliveries_select ON public.webhook_deliveries
            FOR SELECT USING (public.is_super_admin());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_deliveries' AND policyname = 'webhook_deliveries_write') THEN
        CREATE POLICY webhook_deliveries_write ON public.webhook_deliveries
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

-- =====================================================================
-- 2. promotion_redemptions — promotion redemption history
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_code  VARCHAR(50) NOT NULL,
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    invoice_id      UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One redemption per (promotion, tenant, invoice).
    UNIQUE (promotion_code, tenant_id, invoice_id)
);

COMMENT ON TABLE public.promotion_redemptions IS 'Per-tenant promotion redemption history. UNIQUE(promotion_code,tenant_id,invoice_id) enforces once-per-invoice.';
COMMENT ON COLUMN public.promotion_redemptions.discount_amount IS 'Actual discount applied (from BillingService — Money Rule).';

CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promo
    ON public.promotion_redemptions (promotion_code);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_tenant
    ON public.promotion_redemptions (tenant_id);

ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promotion_redemptions' AND policyname = 'promotion_redemptions_select') THEN
        CREATE POLICY promotion_redemptions_select ON public.promotion_redemptions
            FOR SELECT USING (public.is_super_admin() OR public.has_tenant_access(tenant_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promotion_redemptions' AND policyname = 'promotion_redemptions_write') THEN
        CREATE POLICY promotion_redemptions_write ON public.promotion_redemptions
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

-- =====================================================================
-- 3. increment_promotion_redemption — atomic: insert redemption row AND
--    increment redeemed_count in one transaction. Replaces racy read-modify-write.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.increment_promotion_redemption(
    p_promotion_code  VARCHAR(50),
    p_tenant_id       UUID,
    p_invoice_id      UUID,
    p_discount_amount DECIMAL(12,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Insert the redemption row (UNIQUE prevents duplicate per invoice).
    INSERT INTO public.promotion_redemptions (promotion_code, tenant_id, invoice_id, discount_amount)
    VALUES (p_promotion_code, p_tenant_id, p_invoice_id, p_discount_amount);

    -- Increment the redeemed counter atomically.
    UPDATE public.marketing_promotions
       SET redeemed_count = redeemed_count + 1,
           updated_at = NOW()
     WHERE code = p_promotion_code;

    RETURN jsonb_build_object('ok', true, 'promotion_code', p_promotion_code, 'tenant_id', p_tenant_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_promotion_redemption FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_promotion_redemption TO authenticated, service_role;

COMMIT;

-- ============================================================================
-- ROLLBACK:
-- BEGIN;
--   DROP FUNCTION IF EXISTS public.increment_promotion_redemption(
--     VARCHAR, UUID, UUID, DECIMAL);
--   DROP TABLE IF EXISTS public.promotion_redemptions CASCADE;
--   DROP TABLE IF EXISTS public.webhook_deliveries CASCADE;
-- COMMIT;
-- ============================================================================
