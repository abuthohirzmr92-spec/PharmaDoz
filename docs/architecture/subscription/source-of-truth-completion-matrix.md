# Source of Truth Completion Matrix (Official Migration Reference)

Tracks, per migrated domain, the evolution from legacy SoT to new SoT and the
phase at which the legacy source is removed. This is the authoritative reference
for the SLE data migration.

| Domain | Legacy SoT | Dual Source (now) | New SoT | Legacy Removal Phase |
|--------|-----------|-------------------|---------|----------------------|
| **Resource quota (limits)** | `tenant_packages.max_users/max_branches/max_products` | max_* **+** `resource_limits` (reader fallback) | `tenant_packages.resource_limits` (+ `tenant_quota_usage.max_override`) | Phase L (drop `max_*`) after Phase-2 code cutover |
| **Quota usage (counters)** | `tenant_quotas.current_users/current_branches` (dual-key) | `tenant_quotas` **+** `tenant_quota_usage` | `tenant_quota_usage` | Phase L (drop `tenant_quotas`) |
| **Subscription state** | `subscriptions.status` (active/trialing/…) | `status` **+** `lifecycle_state` | `subscriptions.lifecycle_state` (FSM) | Phase L (status → display-only; drop `is_trial`) |
| **Subscription type** | `subscriptions.is_trial` (+ implicit interval) | `is_trial` **+** `subscription_type` | `subscriptions.subscription_type` | Phase L (drop `is_trial`) |
| **Tenant access gate** | `tenants.is_active` (bool) | `is_active` **+** `status` | `tenants.status` (access gate) | Phase L (is_active deprecated) |
| **Feature entitlement** | `package_features` + `feature_flags` JSONB | package_features **+** `package_services`→`service_features` | Service Catalog resolution (via FeatureResolver) | Phase L (optional consolidation) |
| **Onboarding state** | `tenants.onboarding_status` | unchanged (separate concern) | `tenants.onboarding_status` | — (not migrated; distinct from access gate) |

## Rules

- **No SoT flips at column creation.** A new column becomes SoT only after
  (1) backfill 100% populated AND (2) all readers cut over to it.
- **Dual-source is the safe steady state** between Batch 4 and the Phase-2 code
  cutover. Readers MUST prefer the new column and fall back to legacy.
- **Legacy Removal (Phase L)** is a separate, later phase — never bundled with
  backfill. Requires production verification + zero `critical` exceptions.

## Cutover Order (per domain)

```
create column (Batch 2/3)  →  backfill (Batch 4)  →  reader cutover (Phase 2 code)
  →  SoT flip (readers authoritative on new)  →  Legacy Removal (Phase L, drop old)
```
