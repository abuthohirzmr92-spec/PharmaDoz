-- ============================================================================
-- 061_sle_marketing_promotions.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3B (GATE 5 of 5)
-- ============================================================================
-- Marketing Engine — Promotion (first of the family; voucher/referral/
-- affiliate/campaign remain future). Discounts applied at checkout/billing.
--
-- Redemption tracking (promotion_redemptions) is intentionally DEFERRED
-- (postponed set) — belongs to the Billing phase.
--
-- ADDITIVE · IDEMPOTENT · applies_to_plan_id → tenant_packages (exists, nullable).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.marketing_promotions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code               VARCHAR(50) NOT NULL UNIQUE,
    label              VARCHAR(120),
    type               VARCHAR(20) NOT NULL
                           CHECK (type IN ('percent','fixed','trial_extension')),
    value              DECIMAL(12,2) NOT NULL CHECK (value >= 0),
    min_amount         DECIMAL(12,2),
    max_discount       DECIMAL(12,2),
    applies_to_plan_id UUID REFERENCES public.tenant_packages(id) ON DELETE SET NULL,
    valid_from         TIMESTAMPTZ,
    valid_to           TIMESTAMPTZ,
    max_redemptions    INTEGER,
    redeemed_count     INTEGER NOT NULL DEFAULT 0,
    is_active          BOOLEAN NOT NULL DEFAULT true,
    metadata           JSONB NOT NULL DEFAULT '{}',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.marketing_promotions IS 'Promotion codes (percent/fixed/trial_extension). First member of the Marketing Engine; voucher/referral/affiliate deferred.';
COMMENT ON COLUMN public.marketing_promotions.type IS 'percent = % off; fixed = amount off; trial_extension = add trial days.';
COMMENT ON COLUMN public.marketing_promotions.applies_to_plan_id IS 'Restrict promo to a plan; NULL = all plans.';

CREATE INDEX IF NOT EXISTS idx_marketing_promotions_code ON public.marketing_promotions (code);
CREATE INDEX IF NOT EXISTS idx_marketing_promotions_active
    ON public.marketing_promotions (is_active, valid_from, valid_to);

ALTER TABLE public.marketing_promotions ENABLE ROW LEVEL SECURITY;

-- SELECT authenticated (tenants validate a code at checkout); write super_admin.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marketing_promotions' AND policyname = 'marketing_promotions_select') THEN
        CREATE POLICY marketing_promotions_select ON public.marketing_promotions
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marketing_promotions' AND policyname = 'marketing_promotions_write') THEN
        CREATE POLICY marketing_promotions_write ON public.marketing_promotions
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.marketing_promotions CASCADE; COMMIT;
-- ============================================================================
