# EKG v1.0 — Knowledge Governance

## Governance Bodies

| Body | Responsibility |
|------|---------------|
| **Knowledge Board** | Knowledge model integrity, entity approval |
| **Curators** | Entity quality, relationship accuracy |
| **Publishers** | Entity creation (authors) |
| **Reviewers** | Entity validation before PUBLISHED |

## Approval Workflow

```
Publisher creates entity (CREATE)
    ↓
Automated validation (VALIDATE)
    ↓
Reviewer approves (APPROVED)
    ↓
Curator publishes (PUBLISHED)
```

## Deprecation

- Owner initiates deprecation
- 2 MAJOR versions notice for referenced entities
- SUPERSEDES relationship required for replacement
- Archived entities remain referenceable forever

## Retention Authority

- Architecture Board: Constitution, ADRs, Blueprints
- Protocol Board: Protocol, Manifests, Capabilities
- Compliance Board: Rules, Violations, Reports
- Knowledge Board: All other entities
