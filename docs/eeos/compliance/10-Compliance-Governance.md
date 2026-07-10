# ACE v1.0 — Compliance Governance

## Governance Bodies

| Body | Members | Authority |
|------|---------|-----------|
| **Compliance Board** | Chief Architect + 2 Senior Engineers | Rule pack approval, severity classification |
| **Rule Maintainers** | Core contributors | Rule implementation, updates |
| **Certification Reviewers** | Certification Board members | Certification review |
| **Security Reviewers** | Security Board members | Security rule enforcement |

## Appeal Process

1. Engineer appeals violation
2. Compliance Board reviews within 48 hours
3. Decision: UPHELD / OVERTURNED / MITIGATED
4. Precedent documented for future appeals

## Emergency Override

- Available to: Chief Architect + 1 Senior Engineer
- Duration: 72 hours maximum
- Requires: post-override review + permanent fix within sprint

## Rule Deprecation

- 2 MAJOR versions notice before rule removal
- Deprecated rules emit WARNING, not BLOCKING
