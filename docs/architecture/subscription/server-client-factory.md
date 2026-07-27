# Server Client Factory (Infrastructure)

Infrastructure improvement (NOT a domain change). Provides the single entry
point for creating the appropriate Supabase client, and enables privileged
server execution (cron) without redesigning repositories.

## Client types
| Kind | Source | Use |
|------|--------|-----|
| `browser` | existing anon client (`@/lib/supabase/client`) | UI / user-scoped (RLS applies) |
| `server` | SSR cookie client (`@/lib/supabase/server`) | server actions / user-scoped |
| `service_role` | `createClient(URL, SERVICE_ROLE_KEY)` | privileged server execution (cron) — bypasses RLS; can call RPCs granted to `service_role` |
| `test` | future | injected mock in unit tests |

## Design principles honored
- **No business logic** — factory only creates clients.
- **No repository redesign** — `BaseRepository` gains an OPTIONAL injected client
  (constructor param); default behavior (anon module client) is unchanged.
  Repository methods/responsibilities are untouched.
- **No scheduler-specific branching** — the factory is generic; the scheduler
  simply obtains a privileged graph via a small factory.
- **No duplicated client creation / scattered env lookups** — all env access for
  clients lives in `client-factory.ts` only.

## Dependency Injection path (cron)
```
getServiceRoleClient()                         (client-factory)
   ↓ injected into fresh repo instances
createSleRepositories(client)                  (repository-instances)
   ↓ injected into services (constructor DI; defaults = singletons)
createPrivilegedScheduler()                    (scheduler-factory)
   ↓
SchedulerService.runSubscriptionSweep()        (executes via service_role)
```

- Singletons (`subscriptionRepo`, …) remain the anon-backed defaults for UI.
- Cron builds a **privileged instance graph** per invocation using the
  service-role client — no shared mutable global client, no concurrency hazard.
- Services accept optional constructor deps defaulting to the singletons, so all
  existing callers/tests are unaffected.

## Boundary compliance
- Repositories still only persist; they receive a client, they do not choose it.
- Services still orchestrate repositories; DI does not add orchestration to repos.
- The factory is infrastructure, consumed by the composition root (cron handler
  / scheduler-factory), not by repositories.

## Env required
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (service-role, staging/prod only).
