# ADR-PERF-001 — Cursor-Based Server Pagination

## Status: PROPOSED

## Context

MEDISYNC must support datasets of 100,000+ rows. Current offset pagination degrades linearly.

## Decision

**Cursor-based pagination for all server-side data fetching.**

Cursor = base64-encoded `{ id, sortValue }`. Opaque to client. Uses primary key index for O(log n) performance.

## Rejected: Offset Pagination

`OFFSET 10000 LIMIT 50` scans 10,000 rows. At 100,000 rows, query time exceeds 2 seconds.

## Rejected: Page Numbers

Page numbers require `COUNT(*)` on every request. Cursor avoids this.

## Consequences

- Repository must implement cursor encode/decode
- Client cannot jump to "page 50" (acceptable — UX uses infinite scroll or prev/next)
- Cursor is opaque string; client never parses it
