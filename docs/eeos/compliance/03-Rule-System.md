# ACE v1.0 — Rule System

## Rule Hierarchy

```
Rule Pack (collection of rule groups for a domain)
    │
    └── Rule Group (related rules for a compliance category)
        │
        └── Rule (single compliance check)
```

## Rule Definition

| Field | Required | Description |
|-------|:--------:|-------------|
| ruleId | Yes | Unique identifier (kebab-case) |
| version | Yes | Rule version (semver) |
| severity | Yes | INFO/WARNING/MINOR/MAJOR/CRITICAL/BLOCKING |
| category | Yes | Compliance category |
| description | Yes | What this rule checks |
| check | Yes | Validation logic (reference) |
| evidenceRequired | Yes | What evidence is needed |
| blocking | Yes | Whether failure blocks the pipeline |

## Rule Lifecycle

```
DRAFT → PROPOSED → ACCEPTED → ACTIVE → DEPRECATED → ARCHIVED
```

## Rule Inheritance

Rule packs can extend other rule packs. Child packs inherit parent rules. Child packs can override severity (never lower). Child packs can add rules (never remove parent rules).

## Rule Naming

`{category}/{rule-id}@{version}` — e.g., `architecture/constitution-compliance@1.0.0`
