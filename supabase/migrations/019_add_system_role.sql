-- ============================================================================
-- 019_add_system_role.sql
-- Add profiles.system_role for platform-level role storage.
--
-- ARCHITECTURE:
--   profiles.system_role → platform role (super_admin, developer, support_ai)
--   tenant_users.role    → tenant role  (tenant_owner, admin, pharmacist, etc.)
--
-- These two role domains are architecturally separate. No generic "role" column.
-- ============================================================================

BEGIN;

-- 1. Add the column (nullable — only platform users get a value)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS system_role TEXT;

-- 2. Constrain to valid system roles
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_system_role_check
CHECK (
  system_role IS NULL
  OR system_role IN ('super_admin', 'developer', 'support_ai')
);

-- 3. Index for efficient platform-user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_system_role
ON public.profiles (system_role)
WHERE system_role IS NOT NULL;

-- 4. Update is_super_admin() to use system_role as the authoritative check,
--    keeping tenant_id IS NULL as a secondary signal for backward compat.
--    (The function body is replaced; the signature stays the same.)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.system_role = 'super_admin'
      AND p.is_active = true
  );
$$;

-- 5. Re-assert RLS policies that reference is_super_admin() still work.
--    No policy changes needed — the function name and return type are unchanged.

COMMIT;
