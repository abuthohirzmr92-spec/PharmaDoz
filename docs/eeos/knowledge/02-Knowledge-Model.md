# EKG v1.0 — Knowledge Model

## Entity Catalog

| Entity | Purpose | Owner | Immutable? | Versioned? |
|--------|---------|-------|:---------:|:----------:|
| Constitution | Supreme authority | Architecture Board | No (amended) | Yes |
| Blueprint | Architecture design | Chief Architect | No (updated) | Yes |
| ADR | Architecture decision | Architecture Board | Yes (after ACCEPTED) | No |
| Policy | Engineering rule | Policy Engine | No (amended) | Yes |
| Business Rule | Domain rule | Domain Architect | No (amended) | Yes |
| Protocol | Communication standard | Protocol Board | No (versioned) | Yes |
| Capability | Engine capability | Marketplace | No (versioned) | Yes |
| Manifest | Engine/plugin identity | Publisher | No (versioned) | Yes |
| Rule Pack | Compliance rules | Compliance Board | No (versioned) | Yes |
| Execution Report | Session result | Runtime | Yes | No |
| Compliance Report | Compliance result | ACE | Yes | No |
| Workspace | Project container | Organization | No | Yes |
| Project | Engineering project | Workspace | No | Yes |
| Repository | Code repository | Project | No | Yes |
| Engine | EDK engine definition | Developer | No (versioned) | Yes |
| Plugin | Third-party extension | Publisher | No (versioned) | Yes |
| Certification | Certification badge | Certification Board | No (renewed) | Yes |
| Evidence | Compliance evidence | ACE | Yes | No |
| Artifact | Generated document | Runtime/Workspace | Depends | If applicable |

## Entity Ownership

Every entity has exactly ONE owner. No orphan entities. No shared ownership.
