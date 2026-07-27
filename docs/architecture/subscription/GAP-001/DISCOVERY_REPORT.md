# DISCOVERY REPORT — GAP-001

## Current call chain (stopped at approval)

```
UI: /platform/trials (page.tsx)
  → User clicks "Approve" on a trial row (pending/reviewing status)
     ↓
Server Action: trials/actions.ts::approveWithPlan(trialId, reviewerId, planId, days, overrides)
     ↓
TrialRequestRepository.approve()  →  UPDATE trial_requests SET status='approved'
     ↓
     ⛔ STOP — return { ok: true } (TODO comment: "ProvisionTenantService finalizes provisioning — handled by a future orchestration step")
```

## What exists and can be reused

1. **`provisionTenant(input)`** (`src/lib/tenant/provisioning.ts`): server action that validates, creates auth user, calls `provision_tenant` RPC, handles recovery/error classification. Returns `ProvisioningResult { status, tenantId }`.

2. **`provision_tenant` RPC** (migration 072): creates tenant + branch + subscription + quotas + subscription_events + activity_log. Returns `{ tenant_id, subscription_id }`. Already present in the database.

3. **`ProvisionTenantService.resolvePlanForRequest(requestId)`**: reads approved trial, resolves effective plan/duration/overrides. Returns `ResolvedTrialPlan`.

4. **`ProvisionTenantService.finalize()`**: schedules expiry reminders after provisioning. Accepts `{ tenantId, subscriptionId, periodEndISO }`.

## What needs to be wired

In `approveWithPlan()`, AFTER `trialRequestRepo.approve()`:

```
1. Read the full approved trial request
2. Get the package name (slug) from the approved plan UUID
3. Build ProvisioningInput from trial data:
     ownerEmail → trial.email
     ownerDisplayName → trial.applicantName
     tenantName → trial.pharmacyName
     packageSlug → resolved from plan UUID
4. Call provisionTenant(input) — creates user, calls RPC
5. On success:
   a. Extract tenantId from result
   b. Update trial_requests.assigned_tenant_id
   c. Compute periodEndISO from approved duration (or config fallback)
   d. Call provisionTenantService.finalize()
   e. Return { ok: true, tenantId }
6. On failure: return provisionTenant's error/warnings
```

## provision_tenant RPC — parameter compatibility

| Param | Source from trial |
|-------|-------------------|
| p_owner_user_id | Created by authClient().signUp() inside provisionTenant() |
| p_name | trial.pharmacyName |
| p_slug | Auto-generated from pharmacyName |
| p_package_id | Resolved by validator from packageSlug |
| p_domain | NULL (or config) |
| p_settings | {} (or config) |

All required parameters are available from the trial request. ✅

## The ProvisioningInput type
```
interface ProvisioningInput {
  ownerEmail: string;       // → trial.email
  ownerDisplayName: string; // → trial.applicantName
  tenantName: string;       // → trial.pharmacyName
  slug?: string;            // auto-generated from tenantName
  packageSlug?: string;     // resolved from plan UUID → tenant_packages.name
}
```

The validator converts `packageSlug` → package UUID. The validator also checks slug uniqueness and package existence/active status.
