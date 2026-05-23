-- ============================================================================
-- 029_invitation_accept_rls.sql
-- Fix RLS chicken-and-egg deadlock: invited users couldn't INSERT into
-- tenant_users because has_tenant_access() requires an existing membership.
--
-- Also adds missing UPDATE policies for profiles (own row) and
-- invitation_tokens (mark token as used after accept).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. has_pending_invitation(target_tenant_id UUID)
--    SECURITY DEFINER — bypasses RLS so unauthenticated/invited users can
--    check whether they have a valid invitation.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_pending_invitation(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM invitation_tokens
    WHERE tenant_id = target_tenant_id
      AND email = auth.email()
      AND is_used = false
      AND expires_at > now()
  );
$$;

COMMENT ON FUNCTION public.has_pending_invitation(UUID)
  IS 'True if the current user has a valid, unused invitation for the given tenant. SECURITY DEFINER bypasses RLS so unaffiliated users can self-insert into tenant_users.';

-- ---------------------------------------------------------------------------
-- 2. TENANT_USERS — allow invited user to insert themselves
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'tenant_users_insert_invited'
      AND tablename = 'tenant_users'
  ) THEN
    CREATE POLICY "tenant_users_insert_invited" ON tenant_users
      FOR INSERT
      WITH CHECK (
        public.has_pending_invitation(tenant_id)
        AND user_id = auth.uid()
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. PROFILES — allow user to update their own profile
--    (profiles_update requires has_tenant_access, which invited users lack)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'profiles_update_own'
      AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "profiles_update_own" ON profiles
      FOR UPDATE
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. INVITATION_TOKENS — UPDATE policy (missing entirely)
--    - tenant_owner/admin can update tokens in their tenant
--    - invited user can mark their own token as used
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'invitation_tokens_update_tenant_staff'
      AND tablename = 'invitation_tokens'
  ) THEN
    CREATE POLICY "invitation_tokens_update_tenant_staff" ON invitation_tokens
      FOR UPDATE
      USING (
        public.has_tenant_access(tenant_id)
        AND public.user_tenant_role() IN ('tenant_owner', 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'invitation_tokens_update_own'
      AND tablename = 'invitation_tokens'
  ) THEN
    CREATE POLICY "invitation_tokens_update_own" ON invitation_tokens
      FOR UPDATE
      USING (
        email = auth.email()
        AND is_used = false
        AND expires_at > now()
      )
      WITH CHECK (
        is_used = true
        AND used_by = auth.uid()
      );
  END IF;
END $$;

COMMIT;
