# EEP v1.0 — Artifact Protocol

## Artifact Types

| Type | Immutable? | Retention | Owner |
|------|:---------:|-----------|-------|
| Architecture Document | No (versioned) | Forever | Architecture Board |
| ADR | Yes (after ACCEPTED) | Forever | Architecture Board |
| Specification | No (versioned) | Forever | Product Owner |
| Execution Report | Yes | Per project retention policy | Workspace |
| Knowledge Entry | No (updated) | Forever | Community |
| Metrics | Yes (append-only) | Rolling (90 days) | Workspace |
| Logs | Yes (append-only) | Rolling (30 days) | Runtime |
| Evidence | Yes | Per session | Execution Engine |
| Snapshot | Yes | Per session | Workspace |
| History Entry | Yes (append-only) | Forever | Workspace |

## Artifact Relationships

```
Execution Session
    └── Execution Report
    └── Evidence
    └── Snapshots
    └── Metrics
    └── Logs
    └── History Entries

Architecture Package
    └── Blueprint
    └── ADRs
    └── Specifications

Knowledge Base
    └── Bug Entries
    └── Retrospectives
    └── War Room Reports
```

## Ownership

Every artifact has exactly ONE owner. No orphan artifacts. No duplicate ownership.
