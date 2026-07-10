# ADR-EEOS-009 — Repository Health Governance

## Status: PROPOSED

## Context

Engineering health degrades without measurement. Architecture gaps, documentation debt, and knowledge gaps accumulate silently until they become critical.

## Problem

How does EEOS measure and report engineering health objectively?

## Decision

**7-dimension Repository Health Model with defined thresholds.** Metrics: Architecture, Documentation, Governance, Knowledge, Technical Debt, Repository Consistency, Engineering Maturity. Each metric has Healthy/Warning/Critical thresholds with recommended actions. Maturity score computed as weighted composite.

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Subjective health assessment | Not reproducible, not comparable across sprints |
| Binary health (healthy/unhealthy) | Too coarse; doesn't show trends |
| No health measurement | Degradation goes unnoticed until crisis |

## Consequences

- 7 health metrics defined with thresholds
- Engineering Maturity Score: MATURE / ESTABLISHED / DEVELOPING / IMMATURE
- Health checked per sprint (documentation, knowledge), per Epic (architecture), monthly (governance)
- Architecture Board reviews health metrics at Governance Review
