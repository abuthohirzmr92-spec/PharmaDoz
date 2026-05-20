-- ============================================================================
-- 010_activity_logs.sql
-- Medisync SaaS — Append-Only Audit Trail
-- ============================================================================
-- Migration ini mencakup:
--   1. activity_logs — Append-only audit trail for all system events
-- ============================================================================
-- WARNING: This table is APPEND-ONLY. Never UPDATE or DELETE rows.
-- Data in this table is immutable by design for audit compliance.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ACTIVITY_LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
    actor_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    action        VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id   UUID,
    metadata      JSONB DEFAULT '{}',
    ip_address    INET,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE activity_logs IS 'Append-only audit trail. Never UPDATE or DELETE rows.';
COMMENT ON COLUMN activity_logs.id IS 'Primary key, gen_random_uuid()';
COMMENT ON COLUMN activity_logs.tenant_id IS 'FK to tenants — nullable for system-level events without tenant context';
COMMENT ON COLUMN activity_logs.actor_id IS 'FK to profiles — who performed the action';
COMMENT ON COLUMN activity_logs.action IS 'Action identifier (e.g., auth.login, transaction.create, inventory.movement)';
COMMENT ON COLUMN activity_logs.resource_type IS 'Type of resource affected (e.g., transaction, product, user)';
COMMENT ON COLUMN activity_logs.resource_id IS 'UUID of the resource affected (nullable for actions not tied to a specific resource)';
COMMENT ON COLUMN activity_logs.metadata IS 'Arbitrary JSONB payload with action-specific context (diff, snapshot, reason)';
COMMENT ON COLUMN activity_logs.ip_address IS 'Client IP address at the time of the action';
COMMENT ON COLUMN activity_logs.created_at IS 'Timestamp when the action occurred (immutable)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_created ON activity_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs (action);

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
