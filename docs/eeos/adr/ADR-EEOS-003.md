# ADR-EEOS-003 — Deterministic Discovery Order

## Status: PROPOSED

## Context

EEOS must consult multiple documents before implementation: Constitution, Blueprint, ADRs, Business Rules, Knowledge Base, Bugs, Retrospectives. Without a defined order, discovery is non-deterministic and could miss critical constraints.

## Problem

In what order should EEOS consult engineering artifacts to guarantee deterministic, complete discovery?

## Decision

**Architecture-first, specification-last.** Constitution → Blueprint → ADRs → Business Rules → Knowledge Base → Bugs → Retrospectives → Feature Specification.

Architecture constraints are fixed and immutable for a given implementation. Feature requirements adapt to architecture, not vice versa. Therefore, architecture documents are consulted FIRST.

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Feature-first | Architecture may prohibit the feature design entirely — wasted discovery |
| Parallel discovery | Cannot guarantee consistency; later documents may reference earlier ones |
| Random order | Non-deterministic — different runs may produce different results |

## Consequences

- Discovery is deterministic (same inputs → same output every time)
- Architecture violations caught early (before feature design work)
- Knowledge Base consulted before implementation (prevents repeating bugs)
