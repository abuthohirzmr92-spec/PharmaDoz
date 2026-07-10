# ADR-EEOS-006 — Standard Engine Output Contract

## Status: PROPOSED

## Context

12 engines communicate in sequence. Without standardized output, downstream engines cannot reliably consume upstream results.

## Problem

How do engines communicate deterministically without tight coupling?

## Decision

**Standard Output Contract.** Every engine produces: status, summary, evidence, decision, confidence, artifacts_used, risks, dependencies, next_action, blocking_issues. All 12 engines use the same schema.

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Per-engine formats | Downstream engines must parse different formats |
| Free-text output | Not deterministic, not machine-readable |
| No output standardization | Cannot automate pipeline |

## Consequences

- All engines produce identical output structure
- Downstream engines consume known fields
- Future automation depends on this contract
- Contract changes require ADR
