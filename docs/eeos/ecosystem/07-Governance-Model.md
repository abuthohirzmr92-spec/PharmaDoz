# EEOS — Governance Model v1.0

## Governance Bodies

| Body | Members | Authority | Voting |
|------|---------|-----------|:------:|
| **Architecture Board** | Chief Architect + 2 Senior Architects | Architecture decisions, ADR approval, Constitution amendments | Unanimous |
| **Technical Steering Committee** | Core maintainers + Community representatives | Technical roadmap, RFC acceptance | Majority |
| **Core Maintainers** | Active contributors with merge access | Code review, release approval | Consensus |
| **Community Maintainers** | External contributors with triage access | Issue triage, PR review (non-core) | Consensus |
| **Plugin Review Board** | Certification Board members | Plugin certification review | Majority |
| **Security Board** | Security engineers + Core maintainers | Vulnerability response, security policy | Majority |
| **Certification Board** | Architecture Board + External reviewers | Engine certification, badge assignment | Majority |

## Decision Authority

| Decision Type | Authority |
|--------------|-----------|
| Architecture change (ADR) | Architecture Board (unanimous) |
| New feature (RFC) | Technical Steering Committee (majority) |
| Bug fix merge | Core Maintainers (consensus) |
| Plugin certification | Certification Board (majority) |
| Security vulnerability | Security Board (majority, expedited) |
| Constitution amendment | Architecture Board (unanimous + public comment period) |

## Emergency Process

1. Security vulnerability: Security Board acts immediately, reports post-action
2. Critical bug: Core Maintainers can merge hotfix without full review
3. Governance deadlock: Architecture Board casts tie-breaking vote

## ADR Ownership

- Every ADR has one owner (author or designated maintainer)
- ADRs are immutable after ACCEPTED
- Superseded ADRs reference the superseding ADR
- Deprecated ADRs are archived, not deleted
