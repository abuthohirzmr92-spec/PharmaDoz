# ADR-BRAND-004 — Single Upload → Multi-Asset Pipeline

## Status: PROPOSED

## Context

One logo should generate all required brand assets automatically. The tenant should not need to upload separate files for favicon, PWA icons, and receipt logo.

## Problem

How do we ensure a single upload generates ALL required assets consistently?

## Decision

**Implement a deterministic asset pipeline triggered on logo upload.**

1. Upload → validate → process → generate ALL sizes → store → update DB
2. Pipeline is idempotent — re-running with the same input produces the same assets
3. "Regenerate" button for admins to re-run the pipeline (e.g., after a Sharp upgrade)

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Upload separate files for each size | Poor UX, error-prone, inconsistent |
| Generate on first request (lazy) | Slow first load, inconsistent CDN cache |
| Manual processing via external tool | Not scalable, requires human intervention |

## Consequences

- Single upload endpoint handles all generation
- Processing time: ~1-3 seconds (acceptable for infrequent uploads)
- All assets guaranteed consistent (same source image)
