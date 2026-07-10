# EEOS v2.2 — Output Contract

## Purpose

Standardize communication between engines. Every engine output follows the same contract.

## Contract Schema

```json
{
  "engine": "Risk Analysis",
  "execution_id": "eeos-exec-20260710-001",
  "status": "PASS",
  "summary": "No P0 risks. 1 P1 risk with mitigation.",
  "evidence": ["Risk matrix analyzed", "Dependency graph consulted"],
  "decision": "PROCEED",
  "confidence": 0.92,
  "artifacts_used": ["Architecture Blueprint", "ADR-001", "ADR-002"],
  "risks": [
    {
      "id": "R1",
      "severity": "P1",
      "description": "Breaking change to CartItem type",
      "mitigation": "Dual-write pattern for transition"
    }
  ],
  "dependencies": ["inventory-store.ts", "cashier-store.ts"],
  "next_action": "Proceed to Planning",
  "blocking_issues": []
}
```

## Required Fields

| Field | Type | Required? | Description |
|-------|------|:--------:|-------------|
| `engine` | string | Yes | Engine name |
| `execution_id` | string | Yes | From Execution Context |
| `status` | PASS \| FAIL \| WARNING | Yes | Result of this engine |
| `summary` | string | Yes | One-sentence summary |
| `evidence` | string[] | Yes | What was checked |
| `decision` | PROCEED \| BLOCK \| RETRY | Yes | What happens next |
| `confidence` | 0.0–1.0 | Yes | Confidence in this engine's output |
| `artifacts_used` | string[] | Yes | Documents consulted |
| `risks` | Risk[] | No | Risks found (empty if none) |
| `dependencies` | string[] | No | Files affected |
| `next_action` | string | Yes | What the next engine should do |
| `blocking_issues` | string[] | Yes | What blocks progress (empty if none) |

## Decision Rules

| Status | Decision | Meaning |
|--------|:-------:|---------|
| PASS | PROCEED | Continue to next engine |
| WARNING | PROCEED | Continue, document warning |
| FAIL | BLOCK | Stop pipeline, escalate |
| FAIL | RETRY | Stop, fix, re-submit to this engine |

## Compliance

No engine may invent its own output format. All engines use this contract. Future automation depends on standardized output.
