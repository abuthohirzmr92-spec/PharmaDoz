-- ============================================================================
-- 018_super_admin_bootstrap.sql
-- Secure bootstrap for the first Super Admin user.
--
-- This migration provides a stored function that promotes an existing
-- auth user to super_admin (tenant_id = NULL, system_role = 'super_admin').
--
-- SECURITY:
-- - This function runs with SECURITY DEFINER (privileged).
-- - It must ONLY be called server-side (SQL editor, not client API).
-- - The function is NOT exposed via RLS — it lives in a separate schema
--   or is invoked directly by a DBA.
--
-- BOOTSTRAP WORKFLOW:
--   1. User signs up normally via the app (or is created via Supabase dashboard)
--   2. DBA/Super Admin runs: SELECT bootstrap_super_admin('<user-uuid>');
--   3. User's profile is promoted to super_admin with tenant_id = NULL
--   4. User can now access Platform Administration at /admin
--
-- IDEMPOTENT: safe to run multiple times.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Helper: check if a profile row exists for the given auth user
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.get_profile_for_bootstrap(target_user_id UUID)
RETURNS TABLE(profile_id UUID, current_role TEXT, current_tenant_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, COALESCE(system_role, 'staff')::TEXT, tenant_id
  FROM public.profiles
  WHERE id = target_user_id;
$$;

-- --------------------------------------------------------------------------
-- Bootstrap function: promotes a user to super_admin
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bootstrap_super_admin(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Verify the profile exists
  SELECT p.id, p.system_role, p.tenant_id
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = target_user_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user_id: %. Ensure the user has signed up first.', target_user_id;
  END IF;

  -- Promote to super_admin
  UPDATE public.profiles
  SET
    system_role = 'super_admin',
    tenant_id = NULL,
    is_active = TRUE,
    updated_at = now()
  WHERE id = target_user_id;

  -- Remove any tenant-level memberships (super admin is platform-level)
  DELETE FROM public.tenant_users
  WHERE user_id = target_user_id;

  -- Log the bootstrap action
  INSERT INTO public.activity_logs (
    tenant_id,
    actor_id,
    action,
    resource_type,
    resource_id,
    metadata,
    created_at
  ) VALUES (
    NULL,               -- platform-level action
    target_user_id,     -- the user being promoted (self-bootstrap)
    'super_admin.bootstrap',
    'profile',
    target_user_id,
    jsonb_build_object(
      'previous_role', v_profile.system_role,
      'previous_tenant_id', v_profile.tenant_id,
      'bootstrap_method', 'manual_sql'
    ),
    now()
  );

  RETURN format(
    'User %s successfully bootstrapped as super_admin. Previous role: %s, tenant_id: %s.',
    target_user_id, v_profile.system_role, COALESCE(v_profile.tenant_id::TEXT, 'NULL')
  );
END;
$$;

-- --------------------------------------------------------------------------
-- Revoke function: demotes a super_admin back to a regular role
-- (useful for testing or correcting mistakes)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION revoke_super_admin(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT p.id, p.system_role
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = target_user_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user_id: %', target_user_id;
  END IF;

  IF v_profile.system_role != 'super_admin' THEN
    RAISE EXCEPTION 'User % is not a super_admin (current role: %)', target_user_id, v_profile.system_role;
  END IF;

  -- Demote: clear system_role — tenant_id stays NULL until reassigned
  UPDATE public.profiles
  SET
    system_role = NULL,
    updated_at = now()
  WHERE id = target_user_id;

  INSERT INTO public.activity_logs (
    tenant_id,
    actor_id,
    action,
    resource_type,
    resource_id,
    metadata,
    created_at
  ) VALUES (
    NULL,
    target_user_id,
    'super_admin.revoke',
    'profile',
    target_user_id,
    jsonb_build_object('revoke_method', 'manual_sql'),
    now()
  );

  RETURN format('User %s demoted from super_admin to staff.', target_user_id);
END;
$$;

COMMIT;
