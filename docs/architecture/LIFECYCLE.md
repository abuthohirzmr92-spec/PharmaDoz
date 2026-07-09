# MEDISYNC — Architecture Lifecycle

## Document Lifecycle

```
IDEA
  │  Informal. Slack message, meeting note, user feedback.
  ▼
WORKSHOP
  │  Structured exploration. Planning Workshop document created.
  │  Example: docs/architecture/branding/ (workshop output)
  ▼
PRD
  │  Formal product requirements. What, why, success metrics.
  │  Example: 01-PRD.md
  ▼
BLUEPRINT
  │  Technical architecture. Data flow, components, integration.
  │  Example: 02-Architecture-Blueprint.md
  ▼
ADR
  │  Every major decision recorded. Immutable after approval.
  │  Example: adr/ADR-BRAND-001.md
  ▼
REVIEW
  │  Architecture Board review. Quality gate check.
  │  Gate: All ADRs approved, blueprint complete, risks documented.
  ▼
APPROVED
  │  Status change. Package marked APPROVED.
  │  Ready for implementation planning.
  ▼
IMPLEMENTATION PLAN
  │  Engineering Execution Plan. Epics, stories, tasks, estimates.
  │  Example: docs/engineering/V10.2-Engineering-Execution-Plan.md
  ▼
IMPLEMENTATION
  │  Code written. Tests written. Gate-by-gate.
  ▼
HARDENING
  │  Audit for similar patterns. Regression test. Performance test.
  ▼
QA
  │  TypeScript, build, tests, manual smoke test.
  ▼
RELEASE
  │  Merged to main. Deployed.
  ▼
MAINTENANCE
  │  Bug fixes, minor enhancements. No new ADRs needed.
```

## Status Transitions

| From | To | Who |
|------|----|-----|
| IDEA | WORKSHOP | Product Owner |
| WORKSHOP | PRD | Chief Architect |
| PRD | BLUEPRINT | Chief Architect |
| BLUEPRINT | REVIEW | Architecture Board |
| REVIEW | APPROVED | Architecture Board (unanimous) |
| APPROVED | IMPLEMENTING | Engineering Lead |
| IMPLEMENTING | QA | Engineer + Reviewer |
| QA | RELEASE | QA Lead |
| RELEASE | MAINTENANCE | Engineering Lead |
| Any | DEPRECATED | Architecture Board |
