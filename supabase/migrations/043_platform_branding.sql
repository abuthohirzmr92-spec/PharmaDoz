-- ============================================================================
-- 043_platform_branding.sql
-- Platform Branding Settings — Global SaaS appearance
--
-- Stores platform-level branding (app name, logos, favicon).
-- Separate from tenant branding (tenants.settings JSONB).
-- If row is absent or fields are NULL, fallback to defaults.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. platform_settings — Single-row global settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_name          VARCHAR(100),
    tagline           VARCHAR(255),
    logo_url          TEXT,
    sidebar_logo_url  TEXT,
    favicon_url       TEXT,
    extras            JSONB DEFAULT '{}',
    updated_by        UUID REFERENCES profiles(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_settings_single
    ON platform_settings ((true));

-- RLS: super_admin can read/write; all authenticated can read
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ps_select ON platform_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY ps_insert ON platform_settings
    FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin());

CREATE POLICY ps_update ON platform_settings
    FOR UPDATE TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ============================================================================
-- 2. Storage bucket — platform-assets
-- ============================================================================

-- Create bucket via Supabase Dashboard or SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('platform-assets', 'platform-assets', true);

-- Storage RLS policies for platform-assets bucket
DO $$
BEGIN
    -- Create bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'platform-assets',
        'platform-assets',
        true,
        5242880,  -- 5MB
        ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
    )
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Storage RLS: Allow public read on platform-assets
DROP POLICY IF EXISTS "platform_assets_public_read" ON storage.objects;
CREATE POLICY "platform_assets_public_read" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'platform-assets');

-- Storage RLS: Only super_admin can upload to platform-assets
DROP POLICY IF EXISTS "platform_assets_super_admin_insert" ON storage.objects;
CREATE POLICY "platform_assets_super_admin_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'platform-assets'
        AND public.is_super_admin()
    );

-- Storage RLS: Only super_admin can update platform-assets
DROP POLICY IF EXISTS "platform_assets_super_admin_update" ON storage.objects;
CREATE POLICY "platform_assets_super_admin_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'platform-assets'
        AND public.is_super_admin()
    );

-- Storage RLS: Only super_admin can delete from platform-assets
DROP POLICY IF EXISTS "platform_assets_super_admin_delete" ON storage.objects;
CREATE POLICY "platform_assets_super_admin_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'platform-assets'
        AND public.is_super_admin()
    );

COMMIT;
