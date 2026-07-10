# ADR-EEOS-001 — Engine-Based Orchestration

## Status: PROPOSED

## Context

EEOS v1 was prompt-driven. Product Owner reminders were required at every phase. This does not scale.

## Problem

How does EEOS automatically determine the correct engineering workflow without human reminders?

## Decision

**EEOS v2 is engine-based.** Each phase is an independent engine with defined inputs, processing rules, and outputs. The Orchestrator sequences engines and enforces phase transitions.

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Prompt-driven (v1) | Requires human reminders at every phase |
| Linear checklist | Cannot adapt to different request types |
| AI-only pipeline | Not deterministic; depends on model behavior |

## Consequences

- Every phase has a defined engine
- Engines are deterministic (same input → same output)
- The Orchestrator enforces phase ordering
- Product Owner describes WHAT; EEOS determines HOW
