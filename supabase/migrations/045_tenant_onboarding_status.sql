-- ============================================================================
-- 045_tenant_onboarding_status.sql
-- Add onboarding_status column to tenants for Super Admin monitoring
--
-- Values: pending (default) | active | inactive
-- ============================================================================

BEGIN;

-- Add column if it doesn't exist
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(20) NOT NULL DEFAULT 'pending';

COMMENT ON COLUMN tenants.onboarding_status IS
  'Onboarding workflow: pending (owner belum aktivasi), active (berjalan), inactive (dinonaktifkan)';

-- Backfill: existing active tenants → 'active'
UPDATE tenants
  SET onboarding_status = 'active'
  WHERE is_active = true
    AND onboarding_status = 'pending'
    AND deleted_at IS NULL;

-- Set inactive tenants → 'inactive'
UPDATE tenants
  SET onboarding_status = 'inactive'
  WHERE is_active = false
    AND onboarding_status = 'pending'
    AND deleted_at IS NULL;

-- Default constraint after backfill
ALTER TABLE tenants
  ALTER COLUMN onboarding_status SET DEFAULT 'pending';

-- Check constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_onboarding_status_check'
  ) THEN
    ALTER TABLE tenants
      ADD CONSTRAINT tenants_onboarding_status_check
      CHECK (onboarding_status IN ('pending', 'active', 'inactive'));
  END IF;
END $$;

COMMIT;
