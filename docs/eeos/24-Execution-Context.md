# EEOS v2.2 — Execution Context

## Purpose

Every engine receives the same immutable Execution Context for one execution cycle. Context is determined at DISCOVERY and frozen until COMPLETED.

## Context Model

```json
{
  "execution_id": "eeos-exec-20260710-001",
  "task_class": "FEATURE",
  "product": "MEDISYNC",
  "epic": "EPIC-001",
  "sprint": "Sprint 2",
  "story": null,
  "branch": "feature/branding-assets",
  "milestone": "Branding Foundation",
  "release": null,
  "environment": "development",
  "architecture_package": "branding/",
  "adrs_active": ["ADR-BRAND-001", "ADR-BRAND-002"],
  "feature_scope": "Brand Assets (logo upload + processing)",
  "created_at": "2026-07-10T08:00:00Z",
  "frozen": true
}
```

## Context Fields

| Field | Source | Set By | Immutable? |
|-------|--------|--------|:----------:|
| `execution_id` | Generated | Orchestrator | Yes |
| `task_class` | Request analysis | Task Classification | Yes |
| `product` | Repository | Context Discovery | Yes |
| `epic` | Request or branch | Context Discovery | Yes |
| `sprint` | Request or branch | Context Discovery | Yes |
| `story` | Engineering Plan | Planning | No (updated per story) |
| `branch` | Git | Context Discovery | Yes |
| `milestone` | Epic | Context Discovery | Yes |
| `release` | Release Engine | Release Engine | No (set at end) |
| `environment` | Environment variables | Context Discovery | Yes |
| `architecture_package` | Epic mapping | Context Discovery | Yes |
| `adrs_active` | ADR directory | Architecture Compliance | No (updated if new ADR) |
| `feature_scope` | Product Owner request | Context Discovery | Yes |
| `frozen` | Set at creation | Orchestrator | Yes (prevents tampering) |

## Context Consumption

Every engine MUST receive Execution Context as its first input. Engines MUST NOT modify the context. Story-level updates (story, release) are set by the Orchestrator.

## Context Lifecycle

```
DISCOVERY: Context created, frozen
    │
    ▼
All engines receive same context reference
    │
    ▼
Story-level fields updated by Orchestrator between stories
    │
    ▼
COMPLETED: Context archived (sprint notes)
```
