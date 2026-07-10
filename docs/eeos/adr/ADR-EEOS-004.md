# ADR-EEOS-004 — Engineering Memory Model

## Status: PROPOSED

## Context

EEOS consults multiple knowledge sources before implementation. Without a memory model, each execution cycle rediscoveres the same information, and prior investigations are lost.

## Problem

How does EEOS remember prior engineering knowledge across execution cycles?

## Decision

**Categorized memory with deterministic resolution order.** 7 memory categories (Architecture, Bug, Knowledge, Sprint, Decision, Business Rule, Feature) with fixed priority. Memory is resolved in Architecture-first order. Categories have defined lifetimes (Permanent, Sprint-scoped, Epic-scoped).

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Single flat memory | Architecture constraints mixed with bug reports — wrong priority |
| AI-only memory (embeddings) | Non-deterministic, depends on model quality |
| No memory model | Every execution cycle starts from zero |

## Consequences

- 7 memory categories defined
- Deterministic resolution order (Architecture → Feature)
- Memory refreshed per lifecycle event, not per request
- Architecture and Bug memory are permanent (never expire)
