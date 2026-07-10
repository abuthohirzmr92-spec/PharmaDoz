# EEP v1.0 — Execution Contract

## Required Fields

Every execution in EEOS must produce:

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| executionId | string | Yes | Unique identifier |
| protocolVersion | string | Yes | EEP version (e.g., "1.0") |
| context | ExecutionContext | Yes | Immutable execution context |
| status | RUNNING \| COMPLETED \| BLOCKED | Yes | Current status |
| trace | TraceEntry[] | Yes | Ordered execution trace |
| result | ExecutionResult | Yes | Final result (if COMPLETED) |
| metadata | Record<string,string> | No | Extensible metadata |
| confidence | 0.0–1.0 | Yes | Composite confidence |
| startedAt | ISO8601 | Yes | Start timestamp |
| completedAt | ISO8601 | No | Completion timestamp |

## Execution Request

```json
{
  "protocolVersion": "1.0",
  "taskClass": "FEATURE",
  "request": "Add stock indicator to inventory table",
  "product": "MEDISYNC",
  "epic": "EPIC-001",
  "context": { }
}
```

## Execution Result

```json
{
  "executionId": "eeos-20260710-0001",
  "protocolVersion": "1.0",
  "status": "COMPLETED",
  "trace": [],
  "confidence": 0.92,
  "recommendation": "READY_PREVIEW"
}
```
