# Batch 2A — Repository Contract Discovery

Contracts only. No TypeScript implementation until Product Owner review.

**Contract Version: 1.0 · Status: APPROVED (2026-07-12).** Future changes
increment the contract version instead of silently mutating the contract.

All repositories extend `BaseRepository` (`client`, `isConnected`,
`handleError(): never`, `mapRow/mapRows`) and are registered as singletons in
`src/lib/repository-instances.ts`. Runtime/integration remains PENDING.

Conventions:
- Read methods degrade gracefully: `if (!this.isConnected) return <empty>`.
- Query errors go through `this.handleError(error, ctx)` (throws enriched).
- Row→domain mapping via `mapRow/mapRows` (snake→camel).
- **No business-rule hardcode** — config values come from `SettingsRepository`.

---

## 1. SettingsRepository

- **Responsibility:** Read config from `subscription_settings` with effective-window
  + version resolution; cache with TTL from `capability.cache.ttl_seconds`. Sole
  gateway for business-rule values (trial/grace/reminder/billing/payment).
- **Public methods:**
  - `getSetting<T>(key): Promise<T | null>`
  - `getSettings(keys: string[]): Promise<Record<string, unknown>>`
  - `getNumber(key, fallback): Promise<number>`
  - `getBool(key, fallback): Promise<boolean>`
  - `getStringArray(key, fallback): Promise<string[]>`
- **Read ops:** `subscription_settings WHERE key=? AND effective_from<=now AND (effective_until IS NULL OR effective_until>now) ORDER BY version DESC LIMIT 1`.
- **Write ops:** NONE in 2A (super-admin write UI is Phase 7).
- **Transaction boundary:** none (single-row reads). In-memory cache; invalidate on future writes/version bump.
- **Dependencies:** BaseRepository client only. Depended on by nearly every other repo/engine.
- **Reuse candidates:** BaseRepository, mapRow. Fallback defaults mirror the seeded config (safety net only, not a source of truth).
- **Error strategy:** `!isConnected` → return fallback; query error → `handleError`; missing row → `null` → caller uses documented fallback.
- **Unit test strategy:** mock rows → assert highest-version-in-window wins; expired `effective_until` excluded; missing→fallback; cache hit avoids 2nd query; typed helpers coerce JSONB correctly.
- **Risk:** **LOW** (read-only + cache).
- **Transaction Policy:** `NONE` (single-row reads).
- **Caching Policy:** Cacheable **YES** · Layer: in-memory (Redis future) · TTL: from `capability.cache.ttl_seconds` (default 300s) · Refresh: lazy on read after TTL · Invalidation: on settings write / version bump (Phase 7).
- **Performance Notes:** Expected queries: **1** per uncached key (cache hit = 0). Cache strategy: in-memory Map, TTL. N+1 Risk: **none** (per-key). Index dependency: `idx_subscription_settings_key (key, effective_from DESC, version DESC)`.
- **Evolution:** Current (2A) read + cache → Next (Phase 7) super-admin write + versioned scheduling UI → Future policy-scheduled values consumed by Policy Engine (ADR-SLE-030).

## 2. ServiceCatalogRepository

- **Responsibility:** Read service catalog + feature↔service mapping + package→service activation; resolve the feature-key set a package activates (feeds FeatureResolver).
- **Public methods:**
  - `listServices(): Promise<ServiceCatalog[]>`
  - `listFeaturesForService(serviceKey): Promise<ServiceFeature[]>`
  - `getPackageServiceKeys(packageId): Promise<string[]>`
  - `resolvePackageFeatureKeys(packageId): Promise<string[]>` (package_services → service_features)
- **Read ops:** `service_catalog`, `service_features`, `package_services`.
- **Write ops:** NONE in 2A (super-admin catalog CRUD is Phase 7).
- **Transaction boundary:** none (reads).
- **Dependencies:** BaseRepository client. Consumed by FeatureResolver.
- **Reuse candidates:** mapRows.
- **Error strategy:** `!isConnected` → `[]`; query error → `handleError`.
- **Unit test strategy:** mock joined rows → assert `resolvePackageFeatureKeys` maps package→services→features; returns `[]` when `service_features` unseeded (documented Phase-1 state).
- **Risk:** **LOW** (reads). Note: catalog is unseeded until the feature-key standardization step → resolver returns `[]` today by design.
- **Transaction Policy:** `NONE`.
- **Caching Policy:** Cacheable **YES** · Layer: in-memory · TTL: 300s · Refresh: lazy on read · Invalidation: on catalog write (Phase 7).
- **Performance Notes:** Expected queries: `resolvePackageFeatureKeys` = **2** (package_services + service_features); others = 1. Cache strategy: cache resolved feature-set per package. N+1 Risk: **low** (batched via `IN (serviceKeys)`, not per-service). Index dependency: `idx_package_services_package`, `service_features (service_key)`.
- **Evolution:** Current (2A) read + resolve → Next (Phase 7) catalog CRUD + seed after feature-key standardization → Future Feature Registry (ADR-SLE-031) as the FK anchor.

## 3. FeatureResolver enhancement (Feature access)

- **Responsibility:** Authoritative per-tenant feature access. EXTEND the existing
  `src/lib/features/resolver.ts` — do NOT rewrite. Add service-catalog resolution
  and the dependency DAG while preserving the current public API and behavior.
- **Public methods (existing — MUST remain unchanged):**
  - `canAccessFeature(tenantId, featureKey): Promise<boolean>`
  - `getEnabledFeatures(tenantId): Promise<FeatureFlagKey[]>`
  - `getFeatureAccess(tenantId): Promise<FeatureAccess[]>`
- **Public methods (new):**
  - `getUnmetDependencies(tenantId, featureKey): Promise<string[]>`
  - `hasFeatureWithDeps(tenantId, featureKey): Promise<boolean>` (enabled AND all `required` deps satisfied)
- **Read ops:** `subscriptions` (active/trialing gate), `tenants` (package_id, settings.feature_flags), `package_features`, `tenant_packages.feature_flags`, service resolution (via ServiceCatalogRepository), `feature_dependencies`.
- **Write ops:** NONE.
- **Transaction boundary:** none.
- **Dependencies:** ServiceCatalogRepository, features/registry, BaseRepository client.
- **Reuse candidates:** the entire existing resolver (its resolution chain stays as one source); service resolution is an **additional** union source; dependency DAG is a subtractive filter.
- **Resolution model (dual-source, additive-safe):** `enabled = (package_features defaults ∪ service-resolved features ∪ package/tenant overrides)`; `hasFeatureWithDeps` additionally requires all `required` deps enabled (recursive, circular-guarded via visited-set).
- **Error strategy:** `!isConnected` → demo mode all features (preserve current behavior); errors → safe `false` / `handleError` per existing method.
- **Unit test strategy:** ALL existing resolver tests pass unchanged (regression gate); new: unmet dependency blocks `hasFeatureWithDeps`; circular dependency terminates; service-resolution path unions correctly; empty catalog = no behavior change vs today.
- **Risk:** **MEDIUM** (touches the live feature gate; regression-sensitive).
- **Transaction Policy:** `NONE`.
- **Caching Policy:** Cacheable **YES** (becomes part of the Capability Snapshot, Phase 3) · Layer: in-memory · TTL: from `capability.cache.ttl_seconds` · Refresh: on subscription/package/catalog change · Invalidation: event-driven (`capability.invalidate(tenantId)`).
- **Performance Notes:** Expected queries: `canAccessFeature` ≈ 3-5 (subscription gate, tenant, package_features, package feature_flags, feature default); `hasFeatureWithDeps` adds 1 (feature_dependencies) + reuses `getEnabledFeatures`. Cache strategy: Capability Snapshot (Phase 3) collapses to O(1). N+1 Risk: **present today** (per-feature checks) — resolved by the snapshot. Index dependency: `idx_feature_dependencies_feature`, `package_features (package_id, feature_key)`.
- **Evolution:** Current (2A) per-tenant resolution + dependency DAG → Next (Phase 3) Capability Snapshot + cache → Future License-serializable capability set (ADR-SLE-030 License Layer).

## 4. QuotaRepository

- **Responsibility:** Resolve per-resource limit (dual-source), read usage, validate a prospective increment. Supersedes the hardcoded `PACKAGE_DEFAULTS` in `package-limits.ts`.
- **Public methods:**
  - `getLimit(tenantId, resourceKey): Promise<number | null>` (null = unlimited/unset)
  - `getUsage(tenantId, resourceKey): Promise<number>`
  - `getUtilization(tenantId, resourceKey): Promise<{current, max, remaining, percentage}>`
  - `check(tenantId, resourceKey, delta=1): Promise<QuotaCheckResult>`
  - `listUsage(tenantId): Promise<QuotaUtilization[]>`
- **Read ops:** `tenant_quota_usage` (usage + max_override), `tenant_packages.resource_limits` (+ legacy `max_*` fallback), `resource_definitions` (allowlist), `tenants` (→package_id).
- **Write ops:** NONE in 2A (usage counters written by provisioning + the Phase-4 collector; documented as deferred).
- **Transaction boundary:** none (resolve + validate are read-only).
- **Dependencies:** BaseRepository client. Deprecates `package-limits.ts` hardcode.
- **Reuse candidates:** existing `QuotaCheckResult` type (`src/types`); resource→legacy mapping (`users→max_users`, `branches→max_branches`, `products→max_products`, `storage_mb→max_storage_mb`, `cashiers→max_cashier`); other resources resolve only from `resource_limits`.
- **Dual-source limit resolution (order):** `tenant_quota_usage.max_override` → `tenant_packages.resource_limits[key]` → legacy `max_*` (mapped) → `null` (unlimited).
- **Error strategy:** `!isConnected` → demo mode `allowed=true`; missing/`null` limit → treat as unlimited (allowed); query error → `handleError`.
- **Unit test strategy (dual-source MANDATORY):** resource_limits present → used; resource_limits `{}` → fall back to `max_*`; `max_override` present → wins over both; boundary (`current === max` blocks); unlimited (`null`) allows; unknown resource_key handled.
- **Risk:** **MEDIUM** (gates resource creation; dual-source correctness critical).
- **Transaction Policy:** `OPTIONAL` (validate is read-only; future usage mutation may enlist in a caller transaction).
- **Caching Policy:** Limits Cacheable **YES** (short TTL 60s, in-memory); Usage **NOT cached** (near-real-time) · Refresh: lazy on read · Invalidation: on package/override change.
- **Performance Notes:** Expected queries: `getLimit` = 2-3 (usage override, tenant→package, package limits); `check` = getLimit + getUsage. N+1 Risk: **`listUsage` is N+1** (per-row `getLimit`) — acceptable at Phase-2 scale; Phase-3 batches limits per package. Index dependency: `tenant_quota_usage UNIQUE(tenant_id, resource_key)`.
- **Evolution:** Current (2A) resolve + validate (read) → Next (Phase 4) UsageCollector writes counters + live-count reconciliation → Future metered/usage-based billing.

---

## Types to add (Batch 2A, after PO review — before implementation)

To `src/lib/supabase/database.ts` (Row/Insert/Update): `tenant_packages` new
columns (resource_limits, billing_interval, version, parent_package_id,
is_current, is_trial_package, max_storage_mb, max_cashier); `subscriptions` new
columns; `tenants.status/status_changed_at`; and new tables consumed by 2A
(`subscription_settings`, `resource_definitions`, `service_catalog`,
`service_features`, `package_services`, `feature_dependencies`,
`tenant_quota_usage`). Domain interfaces (camelCase) defined per-repository.

## Execution order (this batch)

Repository Contract Discovery → **PO Review** → TS Types Update →
Implementation (Settings → ServiceCatalog → FeatureResolver → Quota) →
Unit Tests → Static Validation → Batch 2A Summary → PO Review.
Runtime integration PENDING (staging). No commits. Database FROZEN.
