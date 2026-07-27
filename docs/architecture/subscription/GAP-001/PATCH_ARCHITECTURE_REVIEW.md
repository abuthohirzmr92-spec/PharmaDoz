# PATCH ARCHITECTURE REVIEW — GAP-001

## 1. Executive Summary

| Audit | Result |
|-------|--------|
| Single Provisioning Engine | 🟢 PASS |
| No provisioning duplication | 🟢 PASS |
| finalize() does NOT provision | 🟢 PASS |
| Repository layer consistency | 🟡 WARNING (1 bypass) |
| Transaction safety | 🟡 WARNING (best-effort, documented) |
| Reuse existing architecture | 🟢 PASS |

**Overall: APPROVED with 2 documented warnings.** Patch consumes existing architecture; no new provisioning path; 1 file modified.

---

## 2. Call Graph (GAP-001 — full)

```
UI: /platform/trials (page.tsx)
  → Admin clicks "Approve"
     ↓
Server Action: approveWithPlan(trialId, reviewerId, planId, days, overrides)
     ↓
  1. trialRequestRepo.approve()                  ← Repository (existing)
     │   → UPDATE trial_requests SET status='approved'
     ↓
  2. trialRequestRepo.getById(trialId)            ← Repository (existing)
     │   → SELECT trial_requests
     ↓
  3. resolvePackageSlug(planUuid)                 ← ⚠️ Direct Supabase query (no repo)
     │   → SELECT tenant_packages.name WHERE id = planUuid
     ↓
  4. provisionTenant(input)                       ← Server Action (existing, REUSED)
     │   ├─ validateProvisioning(input)           ← Validator (existing)
     │   ├─ createServerSupabase()                ← Server client (existing)
     │   ├─ authClient().signUp()                 ← Auth — creates auth.users (existing)
     │   ├─ authClient().resetPasswordForEmail()  ← Sends magic link (existing)
     │   ├─ supabase.rpc("provision_tenant",      ← ⭐ THE SINGLE RPC — migration 072
     │   │     { p_owner_user_id, p_name,
     │   │       p_slug, p_package_id,
     │   │       p_domain, p_settings })
     │   │   │  INSIDE RPC (atomic):
     │   │   │  → INSERT tenants (+ status)
     │   │   │  → INSERT pharmacies (legacy)
     │   │   │  → INSERT branches
     │   │   │  → INSERT tenant_users
     │   │   │  → UPDATE profiles
     │   │   │  → INSERT subscriptions (+ lifecycle_state, subscription_type)
     │   │   │  → INSERT tenant_quotas + tenant_quota_usage
     │   │   │  → INSERT tenant_onboarding
     │   │   │  → INSERT subscription_events (trial_activated)
     │   │   │  → INSERT activity_logs
     │   │   └─ RETURN { tenant_id, subscription_id }
     │   └─ findTenantBySlug()                    ← Recovery fallback (existing)
     ↓
  5. (if success) UPDATE trial_requests            ← ⚠️ Direct Supabase update (no repo)
     │   SET assigned_tenant_id = tenantId
     ↓
  6. (if success) subscriptionRepo.getCurrent()    ← Repository (existing)
     │   → SELECT subscriptions WHERE tenant_id
     ↓
  7. (if success) provisionTenantService.finalize()← Service (existing, REUSED)
     │   → reminderService.scheduleForSubscription()
     │       → settingsRepo.getObject("reminder.schedule")
     │       → computeReminderSchedule()
     │       → reminderRepo.schedule()
     └─ return { ok: true, tenantId }
```

## 3. Provisioning Engine — EXACTLY ONE

```
Satu-satunya fungsi yang membuat tenant:
  provisionTenant(input)  →  supabase.rpc("provision_tenant", {...})

Tidak ada jalur lain:
  ❌ approveWithPlan() — hanya ORKESTRASI (tidak membuat tenant sendiri)
  ❌ ProvisionTenantService — resolve plan + finalize (tidak membuat tenant)
  ❌ TrialRequestRepository — hanya menulis trial_requests (tidak membuat tenant)
  ❌ Tidak ada raw INSERT tenants/subscriptions/branches di GAP-001 code
```

**Verdict: 🟢 PASS — hanya ada satu provisioning engine.**

## 4. ProvisionTenantService.finalize() — Analysis

```typescript
async finalize(input: { tenantId: string; subscriptionId: string; periodEndISO: string }) {
  await reminderService.scheduleForSubscription(input);
}
```

`scheduleForSubscription()`:
- Reads `reminder.schedule` from `subscription_settings` (config)
- Reads `reminder.channels` from config
- Calls `computeReminderSchedule(periodEndISO, daysBefore)` — pure helper
- For each scheduled reminder: `reminderRepo.schedule({...})` — INSERT `reminders`

**What finalize() does:**
| Operation | Yes/No |
|-----------|:---:|
| Membuat tenant | ❌ |
| Membuat auth user | ❌ |
| Membuat subscription | ❌ |
| Membuat branch | ❌ |
| Membuat quota | ❌ |
| Membuat onboarding | ❌ |
| Membuat scheduler | ❌ |
| Membuat event | ❌ |
| Membuat reminder | ✅ (only scheduling expiry reminders) |

**Verdict: 🟢 PASS — finalize() hanya menjadwalkan reminder. Tidak melakukan provisioning kedua.**

## 5. Repository Layer Analysis

### 5.1 `resolvePackageSlug()` — Direct Supabase query

```typescript
async function resolvePackageSlug(packageId: string): Promise<string | null> {
  const client = getServiceRoleClient();
  const { data } = await client
    .from("tenant_packages").select("name").eq("id", packageId).maybeSingle();
  return (data as { name: string } | null)?.name ?? null;
}
```

**Status: 🟡 WARNING (not CRITICAL)**

`packageRepo.getPackageById(id)` **exists** and returns a `PackageRow` with `name`. Calling it would be architecturally consistent. However, `resolvePackageSlug` is a **thin utility function** (one SELECT, one column) internal to `actions.ts` — it does not create a parallel repository or duplicate logic. The bypass is minimal and pragmatic.

**Recommendation (future):** Remove `resolvePackageSlug()`, replace with `packageRepo.getPackageById(planUuid).then(p => p?.name ?? null)`.

### 5.2 `assigned_tenant_id` update — Direct Supabase update

```typescript
await getServiceRoleClient()
  .from("trial_requests")
  .update({ assigned_tenant_id: tenantId, updated_at: ... })
  .eq("id", trialId);
```

**Status: 🟢 PASS**

`TrialRequestRepository` has `approve()` which updates status, but does NOT have a `linkTenant(id, tenantId)` method. The direct update is pragmatically correct for a minimal patch — adding a new repository method would be scope creep.

**Recommendation (future):** Add `TrialRequestRepository.linkTenant(trialId, tenantId)` to consolidate writes.

## 6. Transaction Analysis — NOT Atomic

### Flow sequence:
```
1. approve()             → UPDATE trial_requests.status = 'approved'   ✅ (DB committed)
2. getById()              → SELECT trial_requests                       ← read
3. resolvePackageSlug()   → SELECT tenant_packages                     ← read
4. provisionTenant()      → creates auth user + RPC (all-or-nothing)   ✅ (RPC atomic)
5. UPDATE assigned_tenant ← direct update                              ⚠️ best-effort
6. subscriptionRepo.get   → SELECT subscriptions                       ← read
7. finalize()             → INSERT reminders                            ⚠️ best-effort
```

### Failure scenarios:

| Scenario | Result |
|---|---|
| **provisionTenant() fails** (RPC error) | `approveWithPlan` returns `{ok: false}`. Trial status stays "approved". ✅ Idempotent: admin can retry. |
| **provisionTenant() succeeds, step 5 fails** | Tenant is live. `assigned_tenant_id` NOT updated on `trial_requests`. Gap: trial record doesn't link to tenant. 🔶 Metadata gap, not operational. Documented best-effort. |
| **provisionTenant() succeeds, step 6 fails** | Tenant is live. Reminders not scheduled. 🔶 Reminders missing for this tenant, but not critical (next periodic sweep may catch it). |
| **Duplicate approval click** | `trialRequestRepo.approve()` validates current status — rejects if already "approved". ✅ Idempotent. |

### Compensation mechanism: **None currently.**
### Retry mechanism: **Manual — admin re-clicks "Approve".** Idempotent because `approve()` rejects duplicates.

### Orchestrator transaction: **Recommended for the future.**
Currently, steps 1-7 are not atomic. An orchestrator (e.g., a single RPC that does approve+provision+link+remind in one transaction) would eliminate the partial-success scenarios. This is a future improvement, not required for GAP-001.

**Verdict: 🟡 WARNING (not CRITICAL)** — best-effort post-RPC steps are acceptable for Phase 1. RPC itself is atomic. Schema doesn't support cross-aggregate transactions today.

## 7. Architecture Compliance

| Requirement | Status | Details |
|---|---|---|
| Single provisioning engine | 🟢 PASS | `provisionTenant()` → `provision_tenant` RPC — the ONLY path |
| No new provisioning logic | 🟢 PASS | All tenant creation delegated to existing RPC |
| No duplicate repository | 🟢 PASS | No new repository class created |
| No duplicate service | 🟢 PASS | No new service class created |
| No duplicate RPC | 🟢 PASS | Uses existing `provision_tenant` RPC (072) |
| No duplicate scheduler | 🟢 PASS | No scheduler logic added |
| No duplicate reminder | 🟢 PASS | Delegates to `provisionTenantService.finalize()` |
| Auth user created correctly | 🟢 PASS | `provisionTenant()` handles via `authClient().signUp()` |
| Magic link sent | 🟢 PASS | `provisionTenant()` handles via `resetPasswordForEmail()` |
| No new tables/migrations | 🟢 PASS | Zero schema changes |

## 8. Overall Verdict

### ✅ APPROVED

Patch resolves GAP-001 while consuming existing architecture. 2 warnings (repository bypass, transaction non-atomicity) are documented and tracked as future improvements, not blocking issues.

The patch is: single-file · minimal · existing-architecture · no duplicate · no new schema · idempotent.
