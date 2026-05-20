-- ============================================================================
-- 011_offline_sync.sql
-- Medisync SaaS — Offline Sync & Queue Tables
-- ============================================================================
-- Migration ini mencakup:
--   1. sync_queue — Persistent offline sync queue with idempotency
--   2. offline_sessions — Track offline session periods per device
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SYNC_QUEUE
-- ============================================================================
-- Persists operations performed offline so they can be replayed when the
-- device comes back online. Each entry has an idempotency_key to guarantee
-- exactly-once processing even if the same payload is submitted multiple times.

CREATE TABLE IF NOT EXISTS sync_queue (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    business_day     DATE NOT NULL,
    entry_type       VARCHAR(50) NOT NULL
                     CHECK (entry_type IN (
                         'transaction', 'stock_movement', 'stock_opname',
                         'purchase_invoice', 'product', 'batch'
                     )),
    payload          JSONB NOT NULL,
    idempotency_key  VARCHAR(100) UNIQUE NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
    attempts         INT DEFAULT 0,
    last_error       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at        TIMESTAMPTZ
);

COMMENT ON TABLE sync_queue IS 'Persistent offline sync queue — entries are created offline and synced when connectivity is restored';
COMMENT ON COLUMN sync_queue.id IS 'Primary key, gen_random_uuid()';
COMMENT ON COLUMN sync_queue.tenant_id IS 'FK to tenants — which tenant this sync entry belongs to';
COMMENT ON COLUMN sync_queue.business_day IS 'Business day this entry belongs to (for daily reconciliation)';
COMMENT ON COLUMN sync_queue.entry_type IS 'Type of sync entry: transaction, stock_movement, stock_opname, purchase_invoice, product, batch';
COMMENT ON COLUMN sync_queue.payload IS 'Full serialized data of the entry (JSONB)';
COMMENT ON COLUMN sync_queue.idempotency_key IS 'Unique key for exactly-once processing — prevents duplicate entry replay';
COMMENT ON COLUMN sync_queue.status IS 'Processing status: pending, syncing, synced, failed';
COMMENT ON COLUMN sync_queue.attempts IS 'Number of sync attempts made';
COMMENT ON COLUMN sync_queue.last_error IS 'Error message from the last failed sync attempt';
COMMENT ON COLUMN sync_queue.created_at IS 'Timestamp when the sync entry was created';
COMMENT ON COLUMN sync_queue.synced_at IS 'Timestamp when the entry was successfully synced';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_tenant_status ON sync_queue (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_idempotency ON sync_queue (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sync_queue_business_day ON sync_queue (tenant_id, business_day);

-- ============================================================================
-- 2. OFFLINE_SESSIONS
-- ============================================================================
-- Tracks periods when a device operates offline. Each session has a unique
-- device_id, start time, and periodic heartbeats. When the device reconnects,
-- ended_at is set and all sync_queue entries for this session are processed.

CREATE TABLE IF NOT EXISTS offline_sessions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_id          VARCHAR(255),
    started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_heartbeat     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at           TIMESTAMPTZ,
    transaction_count  INT DEFAULT 0
);

COMMENT ON TABLE offline_sessions IS 'Tracks offline session periods per device — useful for monitoring and reconciliation';
COMMENT ON COLUMN offline_sessions.id IS 'Primary key, gen_random_uuid()';
COMMENT ON COLUMN offline_sessions.tenant_id IS 'FK to tenants — which tenant this device belongs to';
COMMENT ON COLUMN offline_sessions.device_id IS 'Unique device identifier (hardware ID, install ID, etc.)';
COMMENT ON COLUMN offline_sessions.started_at IS 'Timestamp when the offline session started';
COMMENT ON COLUMN offline_sessions.last_heartbeat IS 'Last heartbeat received from the device during this session';
COMMENT ON COLUMN offline_sessions.ended_at IS 'Timestamp when the offline session ended (device reconnected)';
COMMENT ON COLUMN offline_sessions.transaction_count IS 'Number of transactions recorded during this offline session';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offline_sessions_tenant ON offline_sessions (tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_offline_sessions_device ON offline_sessions (device_id);

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
