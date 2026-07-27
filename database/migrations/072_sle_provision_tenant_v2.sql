-- ============================================================================
-- 072_sle_provision_tenant_v2.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 4 (GATE 6 of 6)
-- ============================================================================
-- HIGH RISK: replaces the live provision_tenant RPC (024). Changes are ADDITIVE
-- to behavior — all original 11 steps preserved — plus:
--   * trial duration read from subscription_settings (NO hardcoded 14d)
--   * tenants.status = 'trial' (access gate)
--   * subscriptions.subscription_type='trial' + lifecycle_state='trial_active'
--   * seed tenant_quota_usage (users=1, branches=1)  [dual-write w/ tenant_quotas]
--   * append a 'trial_activated' subscription_event (audit SoT)
--
-- SECURITY DEFINER · SET search_path = '' (all identifiers schema-qualified).
-- IDEMPOTENT: CREATE OR REPLACE. ROLLBACK: re-apply migration 024.
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
    v_tenant_id       UUID;
    v_caller_id       UUID;
    v_branch_code     VARCHAR(20);
    v_subscription_id UUID;
    v_trial_days      INTEGER;
BEGIN
    -- 1. Authorization — caller must be an active super_admin
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = v_caller_id AND p.system_role = 'super_admin' AND p.is_active = true
    ) THEN
        RAISE EXCEPTION 'only_super_admin_can_provision' USING ERRCODE = '42501';
    END IF;

    -- 2. Validate slug uniqueness
    IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = p_slug AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'slug_already_taken: %', p_slug USING ERRCODE = '23505';
    END IF;

    -- 2b. Resolve trial duration from config (NO hardcode; fallback 14).
    SELECT COALESCE((value->>'days')::INTEGER, 14) INTO v_trial_days
    FROM public.subscription_settings
    WHERE key = 'trial.default_duration_days'
      AND effective_from <= NOW()
      AND (effective_until IS NULL OR effective_until > NOW())
    ORDER BY version DESC
    LIMIT 1;
    IF v_trial_days IS NULL THEN
        v_trial_days := 14;
    END IF;

    -- 3. Create tenant (+ SLE access-gate status)
    v_tenant_id := gen_random_uuid();
    INSERT INTO public.tenants (
        id, name, slug, domain, settings, package_id, is_active,
        status, status_changed_at, onboarding_status, created_at, updated_at
    ) VALUES (
        v_tenant_id, p_name, p_slug, p_domain, p_settings, p_package_id, true,
        'trial', NOW(), 'pending', NOW(), NOW()
    );

    -- 4. Legacy pharmacy sync
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
        VALUES (v_tenant_id, p_name, v_pharmacy_code, true, NOW(), NOW());
    END;

    -- 5. Default branch
    v_branch_code := 'BR-' || upper(substr(replace(v_tenant_id::text, '-', ''), 1, 8));
    INSERT INTO public.branches (tenant_id, name, code, is_main, is_active, created_at, updated_at)
    VALUES (v_tenant_id, p_name || ' - Utama', v_branch_code, true, true, NOW(), NOW());

    -- 6. Owner membership
    INSERT INTO public.tenant_users (tenant_id, user_id, role, is_active, joined_at)
    VALUES (v_tenant_id, p_owner_user_id, 'tenant_owner', true, NOW());

    -- 7. Link owner profile
    UPDATE public.profiles SET tenant_id = v_tenant_id, updated_at = NOW()
    WHERE id = p_owner_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'owner_profile_not_found: %', p_owner_user_id USING ERRCODE = '02000';
    END IF;

    -- 8. Trial subscription (+ SLE type/lifecycle; duration from config)
    INSERT INTO public.subscriptions (
        tenant_id, package_id, status,
        current_period_start, current_period_end, trial_end, is_trial,
        subscription_type, lifecycle_state, created_at, updated_at
    ) VALUES (
        v_tenant_id, p_package_id, 'trialing',
        NOW(), NOW() + make_interval(days => v_trial_days), NOW() + make_interval(days => v_trial_days), true,
        'trial', 'trial_active', NOW(), NOW()
    )
    RETURNING id INTO v_subscription_id;

    -- 9a. Legacy quota init (dual-write during transition)
    INSERT INTO public.tenant_quotas (
        tenant_id, pharmacy_id, package_id, current_users, current_branches,
        is_active, started_at, created_at, updated_at
    ) VALUES (
        v_tenant_id, v_tenant_id, p_package_id, 1, 1, true, NOW(), NOW(), NOW()
    );

    -- 9b. New quota usage counters (SoT going forward)
    INSERT INTO public.tenant_quota_usage (tenant_id, resource_key, current_value)
    VALUES (v_tenant_id, 'users', 1), (v_tenant_id, 'branches', 1)
    ON CONFLICT (tenant_id, resource_key) DO NOTHING;

    -- 10. Onboarding state
    INSERT INTO public.tenant_onboarding (tenant_id, current_step, data, created_at, updated_at)
    VALUES (
        v_tenant_id, 'welcome',
        jsonb_build_object(
            'provisioned_by', v_caller_id, 'provisioned_at', NOW(),
            'package_id', p_package_id, 'trial_end', NOW() + make_interval(days => v_trial_days)
        ),
        NOW(), NOW()
    );

    -- 10b. Lifecycle audit event (append-only ledger)
    INSERT INTO public.subscription_events (
        subscription_id, tenant_id, event_type, new_package_id, actor_id, metadata, created_at
    ) VALUES (
        v_subscription_id, v_tenant_id, 'trial_activated', p_package_id, v_caller_id,
        jsonb_build_object(
            'schema_version', 1,
            'trigger', jsonb_build_object('kind', 'system', 'source', 'provision_tenant'),
            'reason', 'tenant_provisioned',
            'after', jsonb_build_object('lifecycle_state', 'trial_active', 'package_id', p_package_id),
            'trial_days', v_trial_days
        ),
        NOW()
    );

    -- 11. Activity log
    INSERT INTO public.activity_logs (
        tenant_id, actor_id, action, resource_type, resource_id, metadata, created_at
    ) VALUES (
        v_tenant_id, v_caller_id, 'tenant.provision', 'tenant', v_tenant_id,
        jsonb_build_object('owner_id', p_owner_user_id, 'package_id', p_package_id, 'slug', p_slug, 'name', p_name),
        NOW()
    );

    RETURN jsonb_build_object('tenant_id', v_tenant_id, 'subscription_id', v_subscription_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.provision_tenant FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_tenant TO authenticated;

COMMIT;

-- ============================================================================
-- ROLLBACK: re-apply migration 024_provision_tenant_function.sql (CREATE OR
-- REPLACE restores the previous RPC body). No data loss.
-- ============================================================================
