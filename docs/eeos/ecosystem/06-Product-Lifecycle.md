# EEOS — Product Lifecycle v1.0

## Stages

```
IDEA ──► ARCHITECTURE ──► IMPLEMENTATION ──► REVIEW
                                                  │
                                                  ▼
                                            CERTIFICATION
                                                  │
                                                  ▼
                                               RELEASE
                                                  │
                                    ┌─────────────┼─────────────┐
                                    ▼             ▼             ▼
                               MAINTENANCE       LTS        DEPRECATION
                                    │                           │
                                    ▼                           ▼
                                 ACTIVE                      ARCHIVE
```

## Stage Definitions

| Stage | Owner | Exit Criteria |
|-------|-------|---------------|
| **IDEA** | Anyone | Proposal documented, Architecture Board aware |
| **ARCHITECTURE** | Chief Architect | Blueprint + ADRs complete, reviewed |
| **IMPLEMENTATION** | Engineering Lead | Code + tests complete, gates passed |
| **REVIEW** | Architecture Board | Compliance verified, no violations |
| **CERTIFICATION** | Certification Board | Level assigned (Official/Certified/etc.) |
| **RELEASE** | Engineering Lead | Published to registry/marketplace |
| **MAINTENANCE** | Maintainer | Bug fixes, minor updates |
| **LTS** | Maintainer | Security patches, critical fixes (18-36 months) |
| **DEPRECATION** | Architecture Board | Notice period served, migration guide published |
| **ARCHIVE** | Engineering Lead | Removed from active registry, documentation archived |

## Responsible Roles

- Product Owner: IDEA → ARCHITECTURE approval
- Chief Architect: ARCHITECTURE → REVIEW
- Engineering Lead: IMPLEMENTATION → RELEASE
- Certification Board: CERTIFICATION
- Maintainer: MAINTENANCE → LTS
- Architecture Board: DEPRECATION → ARCHIVE
