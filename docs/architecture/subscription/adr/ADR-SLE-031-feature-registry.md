# ADR-SLE-031 — Feature Registry

## Status: FUTURE (NOT IMPLEMENTED)

> Documentation only. No schema/code changes now. The Phase-1 implementation
> (globally-unique `service_features.feature_key`) remains valid and unchanged.
> This ADR records the target so the current design does not calcify.

## Context

Phase-1 Batch 3A modelled features via `service_features` with a **globally
unique** `feature_key`, which let `feature_dependencies` FK to it and guarantee
no orphan dependencies (Rev #1). This is correct and sufficient today, and it
encodes one assumption: **a feature belongs to exactly one service.**

## Problem

That assumption may not hold forever:
- A feature might belong to multiple services/modules (e.g. `export_excel`
  shared by Reports and Finance).
- Features may need first-class metadata (owner, GA date, deprecation, tier
  hints) independent of any service mapping.
- The code registry (`src/lib/features/registry.ts`) is the de-facto SoT today,
  but it is not represented as data.

## Decision (FUTURE)

Introduce a dedicated **`feature_registry`** table as the global source of truth
for features. Re-layer the model:

```
feature_registry   (global SoT: feature_key PK/UNIQUE, label, description,
                    category, is_active, deprecated_at, metadata)
   ↓ referenced by
service_features   (mapping layer: feature_key FK → feature_registry;
                    DROP the global UNIQUE so a feature MAY map to N services)
   ↓ referenced by
feature_dependencies (feature_key / requires_feature_key FK → feature_registry)
```

- `feature_registry` becomes the FK target for both `service_features` and
  `feature_dependencies`.
- `service_features` becomes a pure many-to-many mapping (feature ↔ service),
  removing the "one feature → one service" constraint.
- Referential integrity is preserved (deps + mappings reference the registry),
  so the anti-orphan guarantee from Rev #1 is retained by a different anchor.

## Migration Path (when promoted)

1. `CREATE TABLE feature_registry` + seed from `src/lib/features/registry.ts`.
2. Backfill: insert each existing `service_features.feature_key` into registry.
3. Repoint FKs: `feature_dependencies` → `feature_registry`;
   `service_features.feature_key` FK → `feature_registry`.
4. Drop the global UNIQUE on `service_features.feature_key`; keep
   `UNIQUE(service_key, feature_key)`.

All steps additive/idempotent; no data loss.

## Consequences

- **Now:** none. Current implementation is a valid subset (registry-of-one).
- **Later:** unlocks many-to-many feature↔service and rich feature metadata
  without redesign — only the FK anchor moves from `service_features` to
  `feature_registry`.

## Trigger to revisit

Promote to PROPOSED when either: (1) a feature must belong to >1 service, or
(2) features need lifecycle metadata (deprecation, GA) managed as data.
