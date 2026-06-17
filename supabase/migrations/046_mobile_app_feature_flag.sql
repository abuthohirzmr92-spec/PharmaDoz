-- ============================================================================
-- 046_mobile_app_feature_flag.sql
-- Add mobile_app_enabled flag to tenant_packages for PWA mobile access control
-- ============================================================================

BEGIN;

ALTER TABLE tenant_packages
  ADD COLUMN IF NOT EXISTS mobile_app_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant_packages.mobile_app_enabled IS
  'When true, tenant users can access the dashboard via PWA-installed mobile app';

-- Enable for Enterprise by default (set existing enterprise packages)
UPDATE tenant_packages
  SET mobile_app_enabled = true
  WHERE name = 'enterprise'
    AND mobile_app_enabled = false;

COMMIT;
