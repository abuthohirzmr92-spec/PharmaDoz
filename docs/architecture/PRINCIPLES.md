# MEDISYNC — Engineering Principles

**Status: ACTIVE v1.0**

---

## 1. Architecture First

No implementation begins before architecture is approved. Blueprint → ADR → Review → Implement.

## 2. Single Source of Truth

Every data point has ONE authoritative source. Inventory for stock. Product catalog for units. Transaction for sales. No duplication.

## 3. Backward Compatibility

Changes must not break existing behavior. Dual-write during migration. Legacy path remains active until new path is proven.

## 4. Immutable History

Transactions, audit logs, and allocations are immutable after creation. Corrections create new records, not modify old ones.

## 5. Pure Domain Services

Domain logic is stateless, deterministic, and free of framework dependencies. Testable without mocking React, Zustand, or Supabase.

## 6. Dependency Inversion

Domain defines interfaces. Infrastructure implements them. High-level policy never depends on low-level details.

## 7. Explicit State Machines

Every lifecycle is explicitly modeled. States are enumerated. Transitions are validated. Illegal transitions throw errors.

## 8. Type-Level Enforcement

Architecture invariants are enforced by the TypeScript type system wherever possible. If it compiles, it's compliant.

## 9. Evolutionary Refactoring

No Big Bang. Changes are incremental, backward-compatible, and independently deployable. Each sprint delivers value.

## 10. Documentation as Code

Architecture documents are version-controlled alongside code. ADRs, blueprints, and audits live in the same repository.

## 11. Hardening is Mandatory

Every fix includes a hardening phase. Search for similar patterns. Fix all instances. Report findings.

## 12. Demo Mirrors Production

Demo mode exposes the same entities, same pipeline, same business rules as production. Demo is for testing, not for shortcuts.

## 13. Performance by Design

DOM nodes must be constant regardless of dataset size. Pagination is server-side. Virtual scroll for large datasets.

## 14. Platform Attribution

MEDISYNC attribution is mandatory on all transactional documents. Tenants own their brand; the platform owns its identity.

## 15. Zero Scope Creep

Sprint scope is frozen after planning. New requirements become new stories in a future sprint, not additions to the current one.
