# ADR-EEOS-002 — Engine Contract Architecture

## Status: PROPOSED

## Context

EEOS v2 defined 12 engines. Each engine must communicate with others in a deterministic pipeline. Without formal contracts, engines could depend on undeclared data or produce undocumented outputs.

## Problem

How do we guarantee that engines can be composed, replaced, or extended without breaking the pipeline?

## Decision

**Every engine must expose a formal contract: Inputs, Outputs, Guarantees, Failures, Allowed, Forbidden.**

Contracts are documented in `19-Engine-Contracts.md`. New engines must define their contract before integration. Existing engines cannot change their contract without an ADR.

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Implicit contracts | Undocumented dependencies; breaks on engine changes |
| Code-level interfaces (TypeScript) | EEOS is architecture, not code; contracts must be human-readable |
| Centralized schema | Over-engineered for EEOS's purpose |

## Consequences

- 12 engine contracts defined
- New engines plug in via contract compliance
- Contract changes require ADR
- Pipeline determinism improved
