-- ============================================================================
-- 009_subscriptions_payments.sql
-- Medisync SaaS — Subscriptions & Payments Schema
-- ============================================================================
-- SCHEMA ONLY — no payment gateway integration.
-- These tables are ready for future billing integration (Midtrans, Stripe, etc.)
--
-- Migration ini mencakup:
--   1. subscriptions — Active subscription periods per tenant
--   2. payments — Payment transaction records
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SUBSCRIPTIONS
-- ============================================================================
-- Tracks the current and historical subscription periods for each tenant.
-- A tenant may have multiple subscription records over time (renewals).

CREATE TABLE IF NOT EXISTS subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    package_id          UUID NOT NULL REFERENCES tenant_packages(id) ON DELETE RESTRICT,
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end   TIMESTAMPTZ NOT NULL,
    trial_end           TIMESTAMPTZ,
    canceled_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscriptions IS 'Subscription periods per tenant — tracks billing cycles and status';
COMMENT ON COLUMN subscriptions.id IS 'Primary key, gen_random_uuid()';
COMMENT ON COLUMN subscriptions.tenant_id IS 'FK to tenants — which tenant holds this subscription';
COMMENT ON COLUMN subscriptions.package_id IS 'FK to tenant_packages — the tier this subscription is on';
COMMENT ON COLUMN subscriptions.status IS 'Current status: active, trialing, past_due, canceled, expired';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Start of the current billing period';
COMMENT ON COLUMN subscriptions.current_period_end IS 'End of the current billing period';
COMMENT ON COLUMN subscriptions.trial_end IS 'When the trial period ends (if applicable)';
COMMENT ON COLUMN subscriptions.canceled_at IS 'When the subscription was canceled';
COMMENT ON COLUMN subscriptions.created_at IS 'Timestamp when the subscription record was created';
COMMENT ON COLUMN subscriptions.updated_at IS 'Timestamp of last update';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON subscriptions (current_period_end, current_period_start);

-- ============================================================================
-- 2. PAYMENTS
-- ============================================================================
-- Records individual payment transactions linked to subscriptions.
-- Supports multiple payment methods and full audit of payment history.

CREATE TABLE IF NOT EXISTS payments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id   UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount            DECIMAL(12,2) NOT NULL,
    currency          VARCHAR(3) DEFAULT 'IDR',
    status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    payment_method    VARCHAR(50),
    paid_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payments IS 'Payment transaction records — one row per payment. No PII stored (tokenized via payment gateway)';
COMMENT ON COLUMN payments.id IS 'Primary key, gen_random_uuid()';
COMMENT ON COLUMN payments.subscription_id IS 'FK to subscriptions — nullable if payment is orphaned';
COMMENT ON COLUMN payments.tenant_id IS 'FK to tenants — which tenant made this payment';
COMMENT ON COLUMN payments.amount IS 'Payment amount in the specified currency';
COMMENT ON COLUMN payments.currency IS 'ISO 4217 currency code (default IDR)';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, success, failed, refunded';
COMMENT ON COLUMN payments.payment_method IS 'Payment method identifier (e.g., credit_card, bank_transfer, qris)';
COMMENT ON COLUMN payments.paid_at IS 'Timestamp when payment was confirmed successful';
COMMENT ON COLUMN payments.created_at IS 'Timestamp when the payment record was created';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments (subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
