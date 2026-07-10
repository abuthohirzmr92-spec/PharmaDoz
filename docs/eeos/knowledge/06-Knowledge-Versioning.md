# EKG v1.0 — Knowledge Versioning

## Versioning Strategy

| Entity Type | Versioning | History | Supersede |
|------------|:----------:|:------:|:---------:|
| Immutable (ADR, Reports, Evidence) | No | Append-only | SUPERSEDES reference |
| Versioned (Blueprint, Policy, Protocol) | Semver | Full history | SUPERSEDES by newer version |
| Mutable (Workspace, Project) | Timestamped | Change log | N/A |
| Certified (Engine, Plugin) | Semver | Full history | SUPERSEDES by newer version |

## Cross-Version References

- References always target a specific version or "latest"
- "Latest" resolves to the most recent PUBLISHED version
- SUPERSEDES chains are preserved indefinitely
- Archived versions remain referenceable

## Retention

- Immutable entities: forever
- Versioned entities: all versions retained
- Mutable entities: change log retained, old values after 90 days
