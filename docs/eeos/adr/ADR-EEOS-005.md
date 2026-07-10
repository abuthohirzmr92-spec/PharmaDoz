# ADR-EEOS-005 — Policy Driven Execution

## Status: PROPOSED

## Context

EEOS must enforce engineering policies consistently across all tasks. Without centralized policy enforcement, different engineers apply different standards.

## Problem

How does EEOS guarantee consistent policy enforcement across every execution cycle?

## Decision

**Centralized Policy Engine with 12 policies.** Each policy has defined triggers, enforcement rules, blocking conditions, and escalation paths. Blocking policies (P1, P2, P4, P5, P7, P8, P9) stop the pipeline on violation. Advisory policies (P3, P6, P10, P11, P12) warn but continue.

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Engineer discretion | Inconsistent enforcement |
| Code review only | Catches violations too late (after implementation) |
| AI-only policy check | Cannot make authority decisions |

## Consequences

- 12 policies defined (7 blocking, 5 advisory)
- Policy Engine is operational authority after Constitution
- Exceptions require documented process
- Consistent enforcement across all teams
