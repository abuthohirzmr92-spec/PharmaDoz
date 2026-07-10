# ACE v1.0 — Evidence Model

## Evidence Types

| Type | Source | Immutable? | Retention |
|------|--------|:---------:|-----------|
| Source Code | Repository | Versioned (Git) | Forever |
| Architecture Document | `docs/architecture/` | Versioned | Forever |
| ADR | `docs/architecture/**/adr/` | Yes (after ACCEPTED) | Forever |
| Protocol Manifest | `eeos-plugin.json` | Versioned | Forever |
| Execution Report | Runtime | Yes | Per session |
| Logs | Runtime | Append-only | 30 days |
| Repository State | Git | Versioned | Forever |
| Configuration | `.eeos/` | Versioned | Forever |
| Metadata | Runtime + Workspace | Append-only | 90 days |

## Evidence Properties

- Immutable after collection
- Traceable to source
- Versioned (where applicable)
- Cryptographically verifiable (future)
