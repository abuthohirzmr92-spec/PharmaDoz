# IMPLEMENTATION PLAN — GAP-001

## Files to modify: 1

| File | Change |
|------|--------|
| `src/app/(platform)/platform/trials/actions.ts` | Extend `approveWithPlan()` to call `provisionTenant()` after approval |

## Files to import from (reuse, no changes)

| File | What is used |
|------|-------------|
| `src/lib/tenant/provisioning.ts` | `provisionTenant(input)` — creates auth user, calls RPC |
| `src/lib/services/provision-tenant-service.ts` | `provisionTenantService.finalize()` — schedules reminders |
| `src/lib/repository-instances.ts` | `subscriptionRepo` — get subscription after provisioning |

## Logic flow (after `repo.approve()`)

```
1. Read trial request → get email, applicantName, pharmacyName, requestedPlanId, approvedDurationDays
2. Resolve package name (slug) from requestedPlanId UUID
3. Call provisionTenant({ownerEmail, ownerDisplayName, tenantName, packageSlug})
4. On success (status === "success" || "success_with_warning"):
   a. Extract tenantId
   b. Update trial_requests.assigned_tenant_id via repo
   c. Query subscription for the new tenant → get sub.id + sub.currentPeriodEnd
   d. Call provisionTenantService.finalize({tenantId, subscriptionId, periodEndISO})
   e. Return {ok: true, tenantId}
5. On failure: return {ok: false, error: provisioning errors joined}
```

## Risk: 🔴 LOW–MEDIUM

- `provisionTenant()` reads the browser session (cookies) from inside another server action. This is tested infrastructure — both are `"use server"`, cookies propagate in Next.js server actions.
- Trial approval is idempotent: `trialRequestRepo.approve()` validates `current.status` before allowing transition — duplicate click is rejected.
- If RPC succeeds but subsequent steps fail (update assigned_tenant_id, query sub, finalize), the tenant is already created — we document this as best-effort post-provision. No rollback needed (tenant is live, just metadata missing).
