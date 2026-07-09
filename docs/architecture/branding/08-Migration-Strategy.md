# MEDISYNC — Branding Migration Strategy

## Current State

- No multi-tenant branding exists
- All tenants use MEDISYNC default branding
- No slug/subdomain system
- Tenants identified by ID only

## Target State

- Every tenant has a unique slug
- Every tenant can upload their own logo
- Premium tenants get full brand identity
- Subdomains resolve tenant brands

## Migration Phases

### Phase 1 — Slug Assignment (no downtime)

1. Add `slug` column to `tenants` table (nullable, unique)
2. Generate slugs for all existing tenants from their name (auto: lowercase, alphanumeric)
3. Notify tenants of their assigned slug
4. Allow slug change requests (admin process)

### Phase 2 — Subdomain Activation

1. Configure wildcard DNS: `*.medisync.id`
2. Deploy middleware for hostname-based brand resolution
3. Both root domain and subdomain work simultaneously
4. Existing bookmarks continue to work (no redirect)

### Phase 3 — Brand Assets

1. Create `tenant_branding` table
2. Build upload endpoint + asset pipeline
3. MEDISYNC default brand as fallback
4. Tenants can upload logos via settings

### Phase 4 — PWA + Premium

1. Dynamic manifest generation
2. PWA icon registration per tenant
3. Premium tier: unlock login branding, colors, email branding

## Rollback Strategy

| Phase | Rollback |
|-------|----------|
| Phase 1 | Remove slug column (no dependency) |
| Phase 2 | Remove wildcard DNS + middleware |
| Phase 3 | Keep table, hide UI |
| Phase 4 | Degrade Premium to Regular experience |

## Timeline

| Phase | Duration | Dependencies |
|-------|:-------:|-------------|
| Slug Assignment | 1 sprint | None |
| Subdomain | 1 sprint | DNS access |
| Brand Assets | 2 sprints | Supabase Storage, Sharp |
| PWA + Premium | 1 sprint | Phase 3 |
