# EKG v1.0 — Knowledge Lifecycle

## Universal Lifecycle

```
CREATE → VALIDATE → APPROVED → PUBLISHED → REFERENCED
                                                  │
                                                  ▼
                                            SUPERSEDED
                                                  │
                                                  ▼
                                              ARCHIVED
                                                  │
                                                  ▼
                                              RETAINED
```

## Stage Definitions

| Stage | Meaning | Transition Trigger |
|-------|---------|-------------------|
| CREATE | Entity drafted | Author submits |
| VALIDATE | Structure + relationships checked | Automated validation |
| APPROVED | Board/owner approves | Manual approval |
| PUBLISHED | Available for consumption | Published to registry |
| REFERENCED | Actively used by other entities | First reference |
| SUPERSEDED | Replaced by newer entity | New entity published |
| ARCHIVED | Removed from active use | Owner deprecates |
| RETAINED | Permanent historical record | Forever |

## Transition Rules

- Forward-only (except VALIDATE → CREATE for rework)
- SUPERSEDED → ARCHIVED → RETAINED is irreversible
- PUBLISHED entities cannot return to CREATE
