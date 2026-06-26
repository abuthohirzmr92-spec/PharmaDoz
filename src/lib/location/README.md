# Location Management Engine

**PURE DOMAIN LAYER — NO REACT, NO STORE, NO SUPABASE, NO UI**

## Purpose

Single source of truth for all location-related logic in MEDISYNC. Every module — Inventory, Stock Opname, Reports, Cashier — resolves location through this engine. No module calculates location independently.

## Architecture

```
location-types.ts          Domain contracts (leaf — zero dependencies)
    ↓
location-resolution.ts     Resolution chain (batch → purchase → product → legacy)
location-policy.ts         Policy engine (NORMAL, QUARANTINE, RECALL, etc.)
location-validator.ts      Public API → delegates to validators/
location-history.ts        Business history (append-only)
location-mapper.ts         Display / formatting / view-model boundary
    ↓
effective-location.ts      Main entry point — composes resolution + policy + mapper
    ↓
index.ts                   Barrel export — all consumers import from here
```

## Dependency Direction

```
Consumer (UI, Report, Service)
    ↓
index.ts  ← SINGLE IMPORT POINT
    ↓
effective-location.ts  ← ENTRY POINT
    ↓
resolution + policy + mapper  ← INTERNAL ENGINE
    ↓
location-types.ts  ← LEAF (no imports beyond itself)
```

## Forbidden Imports

| Category | Examples |
|---|---|
| React | `react`, `react-dom`, JSX |
| State | `zustand`, `redux`, `jotai` |
| Data | `supabase`, `@/lib/supabase/*` |
| Store | `@/store/*`, `useInventoryStore` |
| Repository | `@/lib/repositories/*` |
| UI | `sonner`, `toast`, `@/components/*` |
| Browser | `window`, `document`, `localStorage` |
| Network | `fetch`, `axios` |
| Routing | `next/navigation`, `next/router` |

## Allowed Imports

- Internal engine modules only (`./location-*`)
- Pure TypeScript type imports

## Extension Points

### Adding a Policy
1. Add value to `LocationPolicy` enum in `location-types.ts`
2. Add case in `applyLocationPolicy()` in `location-policy.ts`
3. Add label in `POLICY_LABELS` in `location-policy.ts`

### Adding a Validator
1. Create function in `validators/`
2. Re-export from `location-validator.ts`
3. Add to barrel in `index.ts` (Section 4)

### Adding a Repository Implementation
1. Implement `LocationRepository` / `LocationProvider` / `LocationHistoryRepository` from `location-types.ts`
2. Wire behind engine via dependency injection
3. Engine itself does NOT import the implementation

### Adding a Display Format
1. Add function to `location-mapper.ts`
2. Add to barrel in `index.ts` (Section 7)
3. Do NOT add formatting to domain files (types, resolution, policy, validator, history)

## Quality Gates

- QG-017: Zero formatting inside domain files
- QG-018: All factories deterministic (no `Date.now()`, `Math.random()`)
- QG-019: Engine boundaries documented
- QG-020: Repository interfaces prepared

## ADRs Implemented

| ADR | Title |
|---|---|
| ADR-001 | `rack_location` retained as LEGACY |
| ADR-002 | Location Management Engine is single entry point |
| ADR-003 | UI Terminology: "Lokasi Utama" / "Lokasi Dipindahkan" |
| ADR-004 | Resolution chain: Batch → Purchase → Product → Legacy |
| ADR-005 | Feature flag gating |
| ADR-006 | Purchase is NOT source of truth |
| ADR-007 | Engine is Single Source of Truth |
| ADR-008 | Product = suggestion, Batch = reality |
| ADR-009 | Activity Log ≠ Location History |
| ADR-010 | Product Default = inheritance for NEW batches only |
