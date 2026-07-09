# ADR-BRAND-001 — Hostname-Based Brand Resolution

## Status: PROPOSED

## Context

MEDISYNC serves multiple tenants. Each tenant needs their own brand identity. We must determine which brand to display for each request.

## Problem

How does the system know WHICH tenant's brand to display?

## Decision

**Resolve brand by hostname at the middleware layer.**

- `medisync.id` → MEDISYNC platform brand
- `{slug}.medisync.id` → tenant brand by slug
- `localhost` → development fallback (MEDISYNC default)

Hostname parsing happens ONCE per request in Next.js middleware. The resolved slug is attached to the request as `x-tenant-slug`.

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Cookie-based | Doesn't work for first visit, shared links, or PWA |
| Query parameter | Ugly URLs, lost on navigation |
| JWT claim | Requires auth for branding — cannot brand login page |

## Consequences

- Middleware must run on every request (acceptable — ~1ms overhead)
- Subdomain must be configured in DNS (wildcard: `*.medisync.id`)
- Slug must be unique across all tenants
