# EEOS — Product Governance v1.0

## Architecture Board

| Role | Responsibility |
|------|---------------|
| Product Owner | Vision, roadmap, edition strategy |
| Chief Architect | Architecture integrity, ADR approval |
| Engineering Lead | Implementation quality, release cadence |
| Community Representative | Open source contributions, plugin ecosystem |

## ADR Workflow

```
Proposal → Review → ACCEPTED / REJECTED
ACCEPTED → Immutable (unless superseded by new ADR)
```

## Release Approval

- Every release passes Architecture Compliance Engine
- Breaking changes require ADR
- LTS releases: 18 months (Professional), 3 years (Enterprise)

## Deprecation Policy

- Public API deprecation: 2 major versions notice
- Deprecated APIs emit warnings for 1 major version before removal
- Breaking changes documented in migration guide

## Compatibility Guarantees

- Runtime contracts: stable across MINOR versions
- EDK contracts: stable across MINOR versions
- Engine output contract: stable forever (certified)
- CLI interface: stable across MINOR versions

## Breaking Change Policy

- MAJOR version bump required
- Migration guide mandatory
- Deprecation period: 1 major version
- Community engines given 6 months to update
