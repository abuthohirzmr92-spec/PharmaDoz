# EKG v1.0 — Knowledge Layer Overview

## Purpose

The EEOS Knowledge Graph (EKG) is the unified knowledge layer consumed by every EEOS component. It is the single source of engineering knowledge — replacing scattered documents, ad-hoc searches, and human memory.

## Goals

1. **Unified**: One knowledge model for all EEOS components
2. **Queryable**: Deterministic resolution of engineering knowledge
3. **Versioned**: Knowledge evolves with clear history
4. **Immutable where required**: ADRs, reports, history are immutable
5. **Relationship-aware**: Knowledge entities reference each other explicitly

## Non-Goals

- EKG does NOT replace the Architecture Constitution
- EKG does NOT store source code
- EKG does NOT replace Git
- EKG is NOT a database (it is a knowledge model)

## Relationships

```
EKG ← Architecture (Constitution, Blueprints, ADRs, Policies)
EKG ← Protocol (Manifests, Contracts, Capabilities)
EKG ← Compliance (Rules, Violations, Reports)
EKG ← Runtime (Execution Reports, Traces)
EKG ← Marketplace (Plugins, Certifications)
→ Consumed by: Runtime, ACE, Dashboard, CLI, AI Engines
```

## Mission (LOCKED)

"EKG is the deterministic, queryable, version-controlled single source of all EEOS engineering knowledge."
