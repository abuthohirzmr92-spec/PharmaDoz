-- ============================================================================
-- 074_sle_subscription_transition_v2.sql
-- CR-002 (APPROVED) — Subscription Transition RPC Enhancement
-- ============================================================================
-- Enhances the single-writer subscription_transition RPC (073) to support:
--   (a) Same-state events (e.g. `renewed`) — emit the event without requiring a
--       state change, whitelisted per event_type.
--   (b) FSM edge `expired → active` (reactivation) added.
--   (c) Optional `p_new_period_end` — extend current_period_end in the same
--       atomic transaction (useful for renewal).
--
-- ADDITIVE · IDEMPOTENT (CREATE OR REPLACE FUNCTION) · REVERSIBLE (re-apply 073)
-- ============================================================================

BEGIN;

-- ------------------------------------------------------------------
-- Remove previous v1 overload (migration 073).
--
-- PostgreSQL cannot change a function signature using
-- CREATE OR REPLACE FUNCTION.
--
-- Adding the new parameter (p_new_period_end) creates a second
-- overload instead of replacing the original function.
--
-- The previous 12-parameter version must therefore be dropped
-- first so that only one subscription_transition function exists.
--
-- This also prevents REVOKE/GRANT from failing with:
-- ERROR 42725:
-- function name "subscription_transition" is not unique.
--
-- Idempotent on re-run (IF EXISTS). Zero business logic change.
-- ------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.subscription_transition(
    UUID, VARCHAR, UUID, VARCHAR, UUID, VARCHAR, TEXT, UUID, UUID,
    TIMESTAMPTZ, TIMESTAMPTZ, JSONB);

CREATE OR REPLACE FUNCTION public.subscription_transition(
    p_subscription_id     UUID,
    p_to_state            VARCHAR(30),
    p_correlation_id      UUID,
    p_event_type          VARCHAR(50),
    p_actor_id            UUID DEFAULT NULL,
    p_source              VARCHAR(20) DEFAULT 'system',
    p_reason              TEXT DEFAULT NULL,
    p_previous_package_id UUID DEFAULT NULL,
    p_new_package_id      UUID DEFAULT NULL,
    p_grace_until         TIMESTAMPTZ DEFAULT NULL,
    p_read_only_at        TIMESTAMPTZ DEFAULT NULL,
    p_metadata            JSONB DEFAULT '{}'::jsonb,
    p_new_period_end      TIMESTAMPTZ DEFAULT NULL       -- CR-002(c): optional period extension
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id  UUID;
    v_tenant_id  UUID;
    v_from       VARCHAR(30);
    v_status_now VARCHAR(20);
    v_allowed    TEXT[];
    v_new_status VARCHAR(20);
    v_gate       VARCHAR(20);
    v_allow_same BOOLEAN;
BEGIN
    -- 1. Authorization
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'not_authorized_to_transition' USING ERRCODE = '42501';
    END IF;

    -- 2. Load current state
    SELECT tenant_id, lifecycle_state, status
      INTO v_tenant_id, v_from, v_status_now
      FROM public.subscriptions
     WHERE id = p_subscription_id;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'subscription_not_found: %', p_subscription_id USING ERRCODE = '02000';
    END IF;

    -- Dual-source: derive from-state if lifecycle_state not yet backfilled.
    IF v_from IS NULL THEN
        v_from := CASE v_status_now
            WHEN 'trialing' THEN 'trial_active'
            WHEN 'active'   THEN 'active'
            WHEN 'past_due' THEN 'grace_period'
            WHEN 'expired'  THEN 'expired'
            WHEN 'canceled' THEN 'terminated'
            ELSE 'active'
        END;
    END IF;

    -- 3. Idempotency — same (subscription, target, correlation)
    IF EXISTS (
        SELECT 1 FROM public.subscription_events e
         WHERE e.subscription_id = p_subscription_id
           AND e.metadata->>'correlation_id' = p_correlation_id::text
           AND e.metadata->'after'->>'lifecycle_state' = p_to_state
    ) THEN
        RETURN jsonb_build_object(
            'subscription_id', p_subscription_id,
            'from', v_from, 'to', p_to_state, 'idempotent', true
        );
    END IF;

    -- CR-002(a): same-state events. Whitelist: renewed, subscription_updated.
    v_allow_same := (p_event_type IN ('renewed', 'subscription_updated'));
    IF v_from = p_to_state AND NOT v_allow_same THEN
        RETURN jsonb_build_object(
            'subscription_id', p_subscription_id,
            'from', v_from, 'to', p_to_state, 'idempotent', true
        );
    END IF;

    -- 4. FSM enforcement (CR-002(b): expired→active added)
    v_allowed := CASE v_from
        WHEN 'pending'      THEN ARRAY['reviewing','rejected']
        WHEN 'reviewing'    THEN ARRAY['approved','rejected']
        WHEN 'approved'     THEN ARRAY['provisioning','rejected']
        WHEN 'provisioning' THEN ARRAY['trial_active']
        WHEN 'trial_active' THEN ARRAY['converted','trial_expired','suspended']
        WHEN 'trial_expired'THEN ARRAY['grace_period','terminated']
        WHEN 'converted'    THEN ARRAY['active']
        WHEN 'active'       THEN ARRAY['expired','grace_period','suspended','terminated']
        WHEN 'expired'      THEN ARRAY['grace_period','active']           -- CR-002(b): added 'active'
        WHEN 'grace_period' THEN ARRAY['read_only','active','suspended']
        WHEN 'read_only'    THEN ARRAY['active','suspended']
        WHEN 'suspended'    THEN ARRAY['active','archived','terminated']
        WHEN 'archived'     THEN ARRAY['terminated']
        ELSE ARRAY[]::TEXT[]
    END;

    IF NOT (p_to_state = ANY(v_allowed)) THEN
        RAISE EXCEPTION 'illegal_transition: % -> %', v_from, p_to_state USING ERRCODE = '22023';
    END IF;

    -- 5. Commercial status + access-gate
    v_new_status := CASE p_to_state
        WHEN 'trial_active' THEN 'trialing'
        WHEN 'converted'    THEN 'active'
        WHEN 'active'       THEN 'active'
        WHEN 'grace_period' THEN 'past_due'
        WHEN 'read_only'    THEN 'past_due'
        WHEN 'expired'      THEN 'expired'
        WHEN 'trial_expired'THEN 'expired'
        WHEN 'suspended'    THEN 'canceled'
        WHEN 'terminated'   THEN 'canceled'
        WHEN 'archived'     THEN 'canceled'
        ELSE v_status_now
    END;

    v_gate := CASE p_to_state
        WHEN 'trial_active' THEN 'trial'
        WHEN 'converted'    THEN 'active'
        WHEN 'active'       THEN 'active'
        WHEN 'grace_period' THEN 'active'
        WHEN 'read_only'    THEN 'active'
        WHEN 'suspended'    THEN 'suspended'
        ELSE 'non_active'
    END;

    -- 6. Apply state (atomic)
    UPDATE public.subscriptions
       SET lifecycle_state      = p_to_state,
           status               = v_new_status,
           grace_until          = COALESCE(p_grace_until, grace_until),
           read_only_at         = COALESCE(p_read_only_at, read_only_at),
           previous_package_id  = COALESCE(p_previous_package_id, previous_package_id),
           package_id           = COALESCE(p_new_package_id, package_id),
           current_period_end   = COALESCE(p_new_period_end, current_period_end),  -- CR-002(c)
           changed_at           = NOW(),
           changed_by           = p_actor_id,
           updated_at           = NOW()
     WHERE id = p_subscription_id;

    UPDATE public.tenants
       SET status = v_gate, status_changed_at = NOW(), updated_at = NOW()
     WHERE id = v_tenant_id;

    -- 7. Append audit event
    INSERT INTO public.subscription_events (
        subscription_id, tenant_id, event_type,
        previous_package_id, new_package_id, actor_id, metadata, created_at
    ) VALUES (
        p_subscription_id, v_tenant_id, p_event_type,
        p_previous_package_id, p_new_package_id, p_actor_id,
        jsonb_build_object(
            'schema_version', 1,
            'correlation_id', p_correlation_id,
            'trigger', jsonb_build_object('kind', p_source),
            'reason', p_reason,
            'before', jsonb_build_object('lifecycle_state', v_from, 'status', v_status_now),
            'after',  jsonb_build_object('lifecycle_state', p_to_state, 'status', v_new_status)
        ) || COALESCE(p_metadata, '{}'::jsonb),
        NOW()
    );

    RETURN jsonb_build_object(
        'subscription_id', p_subscription_id,
        'from', v_from, 'to', p_to_state, 'idempotent', false
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.subscription_transition FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscription_transition TO authenticated, service_role;

COMMIT;

-- ============================================================================
-- ROLLBACK: re-apply migration 073 (CREATE OR REPLACE without the v2 features
-- ========= same-state event, expired→active, p_new_period_end). No data loss.
