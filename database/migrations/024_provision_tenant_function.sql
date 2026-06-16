-- ============================================================================
-- 024_provision_tenant_function.sql
-- Medisync SaaS — Tenant Provisioning Transaction
-- ============================================================================
-- SECURITY DEFINER function that provisions a complete tenant in one atomic
-- database transaction. Called via supabase.rpc('provision_tenant', {...}).
--
-- PROVISIONING SEQUENCE (all or nothing):
--   1. Authorize: caller must be super_admin (profiles.system_role check)
--   2. Validate slug uniqueness
--   3. Create tenant row
--   4. Create legacy pharmacy row (same UUID for backward compat)
--   5. Create default branch (is_main = true)
--   6. Assign owner membership (tenant_users, role = 'tenant_owner')
--   7. Link owner profile to tenant (profiles.tenant_id)
--   8. Create trial subscription (14-day trial)
--   9. Initialize tenant quotas
--  10. Initialize onboarding state
--  11. Log activity
--
-- ROLLBACK: any failure → PostgreSQL rolls back all writes automatically.
--   The only artifact outside this transaction is the auth user created
--   before calling this function — the server action handles compensation.
--
-- IDEMPOTENT: validates slug before insert; safe to retry on different slugs.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.provision_tenant(
    p_owner_user_id UUID,
    p_name          VARCHAR(200),
    p_slug          VARCHAR(100),
    p_package_id    UUID DEFAULT '00000000-0000-0000-0000-000000000101',
    p_domain        VARCHAR(255) DEFAULT NULL,
    p_settings      JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_tenant_id    UUID;
    v_caller_id    UUID;
    v_branch_code  VARCHAR(20);
BEGIN
    -- ----------------------------------------------------------------------
    -- 1. Authorization — caller must be an active super_admin
    -- ----------------------------------------------------------------------
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'authentication_required'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = v_caller_id
          AND p.system_role = 'super_admin'
          AND p.is_active = true
    ) THEN
        RAISE EXCEPTION 'only_super_admin_can_provision'
            USING ERRCODE = '42501';
    END IF;

    -- ----------------------------------------------------------------------
    -- 2. Validate slug uniqueness (idempotency gate)
    -- ----------------------------------------------------------------------
    IF EXISTS (
        SELECT 1
        FROM public.tenants
        WHERE slug = p_slug AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'slug_already_taken: %', p_slug
            USING ERRCODE = '23505';
    END IF;

    -- ----------------------------------------------------------------------
    -- 3. Create tenant
    -- ----------------------------------------------------------------------
    v_tenant_id := gen_random_uuid();

    INSERT INTO public.tenants (
        id, name, slug, domain, settings, package_id, is_active, created_at, updated_at
    ) VALUES (
        v_tenant_id, p_name, p_slug, p_domain, p_settings, p_package_id,
        true, NOW(), NOW()
    );

    -- ----------------------------------------------------------------------
    -- 4. Legacy pharmacy sync (same UUID = same logical entity)
    --    Generate unique pharmacy code with collision handling
    -- ----------------------------------------------------------------------
    DECLARE
        v_base_code TEXT := upper(substr(regexp_replace(p_slug, '[^a-z0-9]', '', 'g'), 1, 6));
        v_pharmacy_code TEXT := v_base_code;
        v_suffix INTEGER := 1;
    BEGIN
        WHILE EXISTS (SELECT 1 FROM public.pharmacies WHERE code = v_pharmacy_code AND deleted_at IS NULL) LOOP
            v_suffix := v_suffix + 1;
            v_pharmacy_code := v_base_code || '-' || v_suffix::TEXT;
        END LOOP;

        INSERT INTO public.pharmacies (id, name, code, is_active, created_at, updated_at)
        VALUES (
            v_tenant_id, p_name, v_pharmacy_code,
            true, NOW(), NOW()
        );
    END;

    -- ----------------------------------------------------------------------
    -- 5. Default branch (main location)
    -- ----------------------------------------------------------------------
    v_branch_code := 'BR-' || upper(substr(replace(v_tenant_id::text, '-', ''), 1, 8));

    INSERT INTO public.branches (
        tenant_id, name, code, is_main, is_active, created_at, updated_at
    ) VALUES (
        v_tenant_id, p_name || ' - Utama', v_branch_code,
        true, true, NOW(), NOW()
    );

    -- ----------------------------------------------------------------------
    -- 6. Owner membership (tenant_users)
    -- ----------------------------------------------------------------------
    INSERT INTO public.tenant_users (
        tenant_id, user_id, role, is_active, joined_at
    ) VALUES (
        v_tenant_id, p_owner_user_id, 'tenant_owner', true, NOW()
    );

    -- ----------------------------------------------------------------------
    -- 7. Link owner profile to tenant
    -- ----------------------------------------------------------------------
    UPDATE public.profiles
    SET tenant_id = v_tenant_id, updated_at = NOW()
    WHERE id = p_owner_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'owner_profile_not_found: %', p_owner_user_id
            USING ERRCODE = '02000';
    END IF;

    -- ----------------------------------------------------------------------
    -- 8. Trial subscription (14-day trial, 30-day billing period)
    -- ----------------------------------------------------------------------
    INSERT INTO public.subscriptions (
        tenant_id, package_id, status,
        current_period_start, current_period_end, trial_end,
        is_trial, created_at, updated_at
    ) VALUES (
        v_tenant_id, p_package_id, 'trialing',
        NOW(), NOW() + INTERVAL '30 days', NOW() + INTERVAL '14 days',
        true, NOW(), NOW()
    );

    -- ----------------------------------------------------------------------
    -- 9. Quota initialization
    -- ----------------------------------------------------------------------
    INSERT INTO public.tenant_quotas (
        tenant_id, pharmacy_id, package_id,
        current_users, current_branches,
        is_active, started_at, created_at, updated_at
    ) VALUES (
        v_tenant_id, v_tenant_id, p_package_id,
        1, 1,
        true, NOW(), NOW(), NOW()
    );

    -- ----------------------------------------------------------------------
    -- 10. Onboarding state
    -- ----------------------------------------------------------------------
    INSERT INTO public.tenant_onboarding (
        tenant_id, current_step, data, created_at, updated_at
    ) VALUES (
        v_tenant_id, 'welcome',
        jsonb_build_object(
            'provisioned_by', v_caller_id,
            'provisioned_at', NOW(),
            'package_id', p_package_id,
            'trial_end', NOW() + INTERVAL '14 days'
        ),
        NOW(), NOW()
    );

    -- ----------------------------------------------------------------------
    -- 11. Activity log (audit trail)
    -- ----------------------------------------------------------------------
    INSERT INTO public.activity_logs (
        tenant_id, actor_id, action, resource_type, resource_id,
        metadata, created_at
    ) VALUES (
        v_tenant_id, v_caller_id,
        'tenant.provision', 'tenant', v_tenant_id,
        jsonb_build_object(
            'owner_id', p_owner_user_id,
            'package_id', p_package_id,
            'slug', p_slug,
            'name', p_name
        ),
        NOW()
    );

    -- ----------------------------------------------------------------------
    -- Success — return the new tenant ID
    -- ----------------------------------------------------------------------
    RETURN jsonb_build_object('tenant_id', v_tenant_id);

END;
$$;

-- --------------------------------------------------------------------------
-- Permissions: allow authenticated users to call this function.
-- Authorization is enforced inside the function (system_role check).
-- --------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.provision_tenant FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_tenant TO authenticated;

COMMIT;
