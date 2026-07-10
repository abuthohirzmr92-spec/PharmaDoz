# EEOS v2.2 — Task Classification Engine

## Purpose

Before Discovery begins, EEOS classifies every request. Different task classes follow different execution paths.

## Classification Matrix

| Class | Description | Discovery Required | Review Required | Gates | Documentation | Regression Scope |
|-------|-------------|:------------------:|:---------------:|:-----:|:------------:|:----------------:|
| **BUG** | Defect in existing behavior | Full | Architecture | All | Bug KB entry | Affected module + related |
| **HOTFIX** | Emergency production fix | Minimal | Architecture (expedited) | TS + Build + Tests | Bug KB entry | Full |
| **FEATURE** | New capability | Full | Architecture + Product Owner | All | PRD + Blueprint + Sprint Plan | Full |
| **ARCHITECTURE** | Design change (Blueprint, ADR, Governance) | Full | Architecture Board (unanimous) | All | ADR + Blueprint update | All modules |
| **REFACTOR** | Code improvement, no behavior change | Architecture only | Architecture | All | None (unless API changes) | Affected module |
| **PERFORMANCE** | Optimization | Architecture + Dependency | Architecture | TS + Build + Tests + Perf | None (unless API changes) | Affected module |
| **SECURITY** | Security fix or hardening | Full | Architecture + Security | All | ADR (if architecture change) | Full |
| **UI** | Visual change only | Architecture | None (unless behavior changes) | TS + Build + Tests | None | None |
| **DOCUMENTATION** | Docs update | None | Peer review | Build (if code examples) | Self-documenting | None |
| **RESEARCH** | Investigation without implementation | None | None | None | Research notes only | None |

## Execution Path Differentiation

```
BUG / HOTFIX:
  Discovery → Bug KB Search → Architecture → Risk → Fix → Verify → Regress → Hardening → Close

FEATURE:
  Discovery → Architecture → ADR → Risk → Planning → Implementation → Verify → Regress → Hardening → Docs → Release

ARCHITECTURE:
  Discovery → ADR → Board Review → Blueprint Update → Planning → (Implementation in separate Epic)

REFACTOR / PERFORMANCE:
  Discovery → Architecture → Dependency → Risk → Implementation → Verify → Regress

UI:
  Discovery → Implementation → Verify

DOCUMENTATION / RESEARCH:
  No execution pipeline — immediate completion
```

## Classification Signals

| Signal in Request | Classification |
|-------------------|---------------|
| "bug", "error", "crash", "broken", "regression" | BUG |
| "urgent", "production down", "hotfix" | HOTFIX |
| "feature", "epic", "build", "implement" | FEATURE |
| "architecture", "blueprint", "ADR", "design" | ARCHITECTURE |
| "refactor", "cleanup", "simplify", "extract" | REFACTOR |
| "slow", "performance", "optimize", "perf" | PERFORMANCE |
| "security", "vulnerability", "auth" | SECURITY |
| "ui", "ux", "style", "layout", "display" | UI |
| "doc", "documentation", "readme" | DOCUMENTATION |
| "research", "investigate", "audit" | RESEARCH |
