# EEOS v2.3 — Consistency Checker

## Purpose

Detect conflicts, contradictions, duplicates, and broken references across all EEOS documents.

## Consistency Dimensions

| Dimension | What It Compares | Detection |
|-----------|-----------------|-----------|
| **Cross-Reference** | Every document reference resolves to an existing file | Broken → FAIL |
| **Circular Reference** | A → B → A reference loops | Circular → FAIL |
| **Duplicate Definition** | Same concept defined in two places with different text | Duplicate → WARNING |
| **Contradiction** | Two documents make opposing claims | Contradiction → FAIL |
| **Dead Reference** | Reference to a deleted or renamed file | Dead → WARNING |
| **Orphan Document** | Document not referenced by any other document | Orphan → WARNING (unless self-contained) |

## Conflict Resolution Strategy

```
Conflict Detected
    │
    ├── Determine: which document has HIGHER authority?
    │     Constitution > Blueprint > ADR > Policy > Sprint Plan
    │
    ├── HIGHER authority wins
    │     Lower document must be updated to match
    │
    └── EQUAL authority (two ADRs conflict)
          → Newer ADR supersedes older (explicit reference required)
          → If neither references the other → Architecture Board decides
```

## Consistency Rules

| Rule | Check |
|------|-------|
| R1 | Every ADR must be referenced by at least one Blueprint or Sprint Plan |
| R2 | Every Blueprint section must reference its governing ADR |
| R3 | Every Policy must reference the Constitution principle it enforces |
| R4 | Every Engine must appear in the Engine Registry |
| R5 | Every Artifact must appear in the Artifact Registry |
| R6 | No document may claim authority higher than the Constitution |

## Output

```json
{
  "engine": "Consistency Checker",
  "status": "PASS",
  "cross_references": { "total": 42, "broken": 0 },
  "circular": [],
  "duplicates": [],
  "contradictions": [],
  "dead_references": [],
  "orphans": ["docs/eeos/ADR-001-UUCE.md"]
}
```
