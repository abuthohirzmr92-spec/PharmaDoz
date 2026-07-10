# EKG v1.0 — Knowledge Query Model

## Conceptual Queries

| Query | Description |
|-------|-------------|
| `FIND ADRs WHERE module = "Inventory"` | All ADRs affecting a module |
| `FIND Policies WHERE governs = "Workspace"` | All policies for a domain |
| `FIND Rules WHERE validates = "Engine"` | All rules for engine validation |
| `FIND Artifacts WHERE generatedBy = executionId` | All artifacts from a session |
| `FIND Entities WHERE references = entityId` | All entities referencing one entity |
| `TRACE relationship FROM ADR-001` | Full relationship graph from one entity |

## Query Principles

- Deterministic: same query → same results
- Relationship-aware: queries traverse relationships
- Version-aware: queries can target specific versions
- Immutable-aware: immutable entities are always included

## No Implementation

This is a CONCEPTUAL query model. Implementation belongs to Phase 3+ (Knowledge Resolution).
