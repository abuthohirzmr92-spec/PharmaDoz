# ADR-EEOS-008 — Architecture Drift Detection

## Status: PROPOSED

## Context

Implementation can diverge from architecture over time. Features get added without Blueprint updates. ADRs become stale. Business rules change without documentation. This drift accumulates silently.

## Problem

How does EEOS detect when implementation has diverged from architecture?

## Decision

**Drift detection via cross-reference comparison.** EEOS compares Blueprint ↔ Source Code, ADR ↔ Blueprint, Business Rule Docs ↔ Implementation. Drift severity: CRITICAL (blocks all work), HIGH (must fix this sprint), MEDIUM (fix this Epic), LOW (fix when convenient).

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Trust developers to notice | Drift accumulates silently over months |
| Code review only | Catches drift per-PR, not architectural drift across Epics |
| Manual audit only | Not scalable across 50+ documents |

## Consequences

- 8 drift types defined with severity levels
- Drift prevention: Blueprint must be APPROVED before implementation
- Drift check at sprint closure + Epic transition
- CRITICAL drift blocks all implementation
