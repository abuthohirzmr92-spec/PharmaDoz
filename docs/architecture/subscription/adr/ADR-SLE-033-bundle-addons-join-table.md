# ADR-SLE-033 — Bundle Add-ons Join Table

## Status: FUTURE (NOT IMPLEMENTED)

> Documentation only. No schema/code changes now. The Phase-1 implementation
> (`package_bundle.included_addons` as a JSONB array of `addon_key`) remains
> valid and is explicitly a **transitional** representation.

## Context

`060_sle_package_bundle.sql` stores a bundle's add-ons as a JSONB list of
`addon_key` strings, validated at the application/seed layer. This is compact
and sufficient for Phase 1, where a bundle is just "a package + a few add-ons".

## Problem

A soft JSONB list cannot cleanly express future needs:
- **ordering** of add-ons within a bundle,
- per-line **metadata** (badge, highlight, note),
- **audit** of add/remove changes,
- **enable/disable** a bundled add-on without rewriting the array,
- per-bundle **pricing overrides** at the add-on line level,
- **referential integrity** (JSONB keys are not FK-checked).

## Decision (FUTURE)

Promote the relationship to a first-class join table:

```
package_bundle
   ↓ (1:N)
bundle_addons   (bundle_id FK → package_bundle,
                 addon_key FK → addons,
                 sort_order, is_enabled, price_override, metadata JSONB,
                 UNIQUE(bundle_id, addon_key))
   ↓ (N:1)
addons
```

## Migration Path (when promoted)

1. `CREATE TABLE bundle_addons` (additive).
2. Backfill: expand each `package_bundle.included_addons` array element into a
   `bundle_addons` row.
3. Switch readers to `bundle_addons`.
4. Deprecate `package_bundle.included_addons` (keep as fallback, then drop in a
   later legacy-removal step).

All additive/idempotent; no data loss.

## Consequences

- **Now:** none. JSONB list works and keeps Batch 3B in scope.
- **Later:** ordering/metadata/audit/pricing/FK integrity become available
  without redesign — only the storage of the bundle→addon relation moves.

## Trigger to revisit

Promote to PROPOSED when a bundle needs per-add-on ordering, pricing, toggling,
or auditable change history.
