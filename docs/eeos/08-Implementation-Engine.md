# EEOS v2.0 — Implementation Engine

## Responsibility

Define the implementation workflow after all discovery and review phases complete.

## Implementation Workflow

```
Story Breakdown
    │
    ▼
Task Assignment (dependency order)
    │
    ▼
Implementation (one story at a time)
    │
    ▼
Gate Review (TypeScript + Build + Tests)
    │
    ▼
Next Story / Complete
```

## Story Structure

Every story:
1. Has a single, clear deliverable
2. Has defined acceptance criteria
3. Has defined exit criteria
4. Depends only on completed stories
5. Is independently testable

## Engineering Gates

Each story gate verifies:

- TypeScript: 0 errors
- Build: PASS
- Tests: all PASS (new + existing)
- Architecture: 0 violations
- No scope creep beyond story definition

## Anti-Patterns

The Implementation Engine prohibits:

- Big Bang refactors (all changes at once)
- Scope creep (adding work mid-story)
- Skipping gates (even "small" changes)
- Direct pushes to master
- Implementation before architecture review
