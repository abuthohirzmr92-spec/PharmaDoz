# Privileged Execution Policy (Service Role)

Rules governing use of the **Service Role Client** (RLS-bypassing). Violations
risk tenant-isolation loss and full-database compromise.

## Allowed callers
- **Scheduler** — cron sweeps / reminder dispatch (via `createPrivilegedScheduler`).
- **Provisioning** — tenant creation server action (`provision_tenant` RPC).
- **Maintenance** — admin maintenance/background operations (super-admin gated).
- **Background Jobs** — server-only jobs that must act across tenants.

## NOT allowed
- **Browser** / any client-side code.
- **React Client Components** (`"use client"`).
- **User-facing UI** flows.
- **Public APIs** / unauthenticated endpoints.

## Mandatory conditions for any privileged call
1. **Server-only.** Obtained via `getServiceRoleClient()`; the key
   (`SUPABASE_SERVICE_ROLE_KEY`) must never be exposed to the client bundle
   (no `NEXT_PUBLIC_` prefix).
2. **Independently authorized.** The caller must verify authorization BEFORE
   using the client:
   - Cron → valid `CRON_SECRET` (`isAuthorizedCron`).
   - Admin/maintenance → super-admin check.
3. **Auditable.** Privileged state changes must leave a trail
   (`subscription_events` via the transition RPC; `scheduler_runs` for jobs).
4. **Least privilege in intent.** Use the service role only for operations that
   genuinely require crossing RLS; prefer the user/server client otherwise.

## Security rationale
- The service role **bypasses Row-Level Security**, so tenant isolation — the
  platform's highest-priority guarantee — depends entirely on correct,
  server-only usage.
- Leaking the service-role key equals full read/write to every tenant's data.
  Keeping it server-only and centralized in the factory minimizes exposure
  surface and makes audit/rotation tractable.
- Requiring explicit authorization before privileged use ensures RLS bypass is
  never reachable from an unauthenticated or user-triggered path.

## Enforcement
- Single source: `client-factory.getServiceRoleClient()` (grep-auditable).
- Cron handlers gate on `CRON_SECRET`; the transition RPC additionally rejects
  non-super-admin authenticated callers.
- Review rule: any new `getServiceRoleClient()` caller must be on the allowed
  list and satisfy the mandatory conditions above.
