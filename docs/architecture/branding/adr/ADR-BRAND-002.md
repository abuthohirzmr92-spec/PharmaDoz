# ADR-BRAND-002 — Content-Hash Fingerprinted Asset URLs

## Status: PROPOSED

## Context

Brand assets (logos, icons) must be cached aggressively for performance, but must also update immediately when a tenant uploads a new logo.

## Problem

How do we cache brand assets for 1 year while allowing instant updates?

## Decision

**All brand assets use content-hash fingerprinted URLs.**

- Filename: `{asset}-{sha256_hex_8}.{ext}`
- Example: `logo-a3f8c21b.png`
- URL changes when content changes → automatic cache bust
- Old files retained 30 days for rollback, then deleted

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Query string cache bust (`?v=2`) | Some CDNs ignore query strings; less reliable |
| Short TTL + revalidate | Constant CDN misses; higher origin load |
| No cache | Unacceptable performance for PWA assets |

## Consequences

- Database stores the CURRENT URL (includes hash)
- CDN and browser use immutable caching (1 year)
- New upload → new hash → new URL → instant "update"
