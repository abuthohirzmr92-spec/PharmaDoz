-- =================================================================
-- 053_uuce_display_snapshots.sql
-- UUCE — Display Snapshot support for unit conversion audit
-- EEOS Business Core — Layer 0 Foundation
-- =================================================================

-- ─── Display Snapshots Table ───

CREATE TABLE IF NOT EXISTS display_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  tree_hash VARCHAR(64) NOT NULL,
  tree_version INTEGER NOT NULL DEFAULT 1,
  snapshot_data JSONB NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, tree_version)
);

CREATE INDEX IF NOT EXISTS idx_display_snapshots_product
  ON display_snapshots(product_id, tree_version DESC);

-- ─── purchase_items: display context columns ───

ALTER TABLE purchase_items
  ADD COLUMN IF NOT EXISTS display_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS display_unit VARCHAR(50),
  ADD COLUMN IF NOT EXISTS display_unit_price DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS snapshot_id UUID REFERENCES display_snapshots(id);

-- ─── transaction_items: display context columns ───

ALTER TABLE transaction_items
  ADD COLUMN IF NOT EXISTS display_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS display_unit VARCHAR(50),
  ADD COLUMN IF NOT EXISTS display_unit_price DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS snapshot_id UUID REFERENCES display_snapshots(id);

-- ─── product_batches: tree version tracking ───

ALTER TABLE product_batches
  ADD COLUMN IF NOT EXISTS tree_version INTEGER NOT NULL DEFAULT 1;

-- ─── RLS: display_snapshots read access ───

ALTER TABLE display_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY display_snapshots_read ON display_snapshots
  FOR SELECT USING (true);  -- Read-only reference table
