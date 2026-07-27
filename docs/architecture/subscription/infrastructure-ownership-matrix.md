# Infrastructure Ownership Matrix

Ownership and boundaries for every Supabase client produced by the Server Client
Factory (`src/lib/supabase/client-factory.ts`). This is the authoritative
reference for which client may be used where.

| Client | Intended Usage | Allowed Callers | Lifecycle | Security Boundary |
|--------|----------------|-----------------|-----------|-------------------|
| **Browser Client** (anon) | User-scoped reads/writes from the UI, subject to RLS | Client components, hooks, repositories running in a user context | Module singleton; lives for the browser session / SSR request | RLS-enforced as the authenticated (or anon) user. Anon key is public by design. **Never** calls privileged RPCs (e.g. `subscription_transition`, granted to `service_role` only). |
| **Server Client** (SSR cookie) | Server actions / route handlers acting **as the logged-in user** | Server actions, route handlers that read the auth cookie | Per-request; bound to the request's cookies | User-scoped; RLS applies as that user. No privilege elevation. |
| **Service Role Client** | Privileged server execution that must bypass RLS or call service-role RPCs | `scheduler-factory` (cron), provisioning server action, maintenance / background jobs | Memoized server-side singleton; created lazily from env; **never** instantiated in the browser | **Bypasses RLS** — full data access. Backed by `SUPABASE_SERVICE_ROLE_KEY` (secret, server-only). Must never appear in a client bundle. Callers must independently authorize the operation (cron secret / super-admin). |
| **Test Client** (future) | Injected mock/stub in unit & integration tests | Test suites only | Per-test | No real network/DB; deterministic. Never used in production code paths. |

## Notes
- All four are obtained **only** through the factory — no ad-hoc `createClient`
  calls elsewhere, no scattered env lookups.
- The factory is the single place env vars for clients are read.
- Repositories receive a client (default anon) via `BaseRepository`'s optional
  injected client; they never choose which client to create.
