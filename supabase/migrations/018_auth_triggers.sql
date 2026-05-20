-- ============================================================================
-- 018_auth_triggers.sql
-- Auto-create profile + handle first login for existing auth users
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Function: auto-create profile when a new auth.users row is inserted
-- ============================================================================
-- Supabase runs this trigger in the auth schema context, so it has access
-- to auth.users metadata via NEW.*
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Trigger: fire after insert on auth.users
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. Backfill: create profiles for existing auth.users that don't have one
-- ============================================================================

INSERT INTO public.profiles (id, display_name, is_active, created_at, updated_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'display_name', au.email),
  TRUE,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. Function: ensure profile exists for a given user (used at login)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_profile(user_id UUID)
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_record public.profiles;
BEGIN
  -- Try to get existing profile
  SELECT * INTO profile_record FROM public.profiles WHERE id = user_id;

  -- If not found, create one from auth.users
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, display_name, is_active, created_at, updated_at)
    SELECT
      au.id,
      COALESCE(au.raw_user_meta_data ->> 'display_name', au.email),
      TRUE,
      NOW(),
      NOW()
    FROM auth.users au
    WHERE au.id = user_id
    ON CONFLICT (id) DO UPDATE
      SET updated_at = NOW()
    RETURNING * INTO profile_record;
  END IF;

  RETURN profile_record;
END;
$$;

COMMIT;
