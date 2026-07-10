# EEOS v2.1 — Artifact Registry

## Engineering Artifacts

| Artifact | Purpose | Owner | Lifecycle | Consumers | Update Policy | SSOT |
|----------|---------|-------|-----------|-----------|---------------|------|
| **Architecture Constitution** | Supreme engineering authority | Architecture Board | Active → Amended | All engines | Amendment via ADR + unanimous approval | `docs/architecture/CONSTITUTION.md` |
| **Architecture Blueprint** | Technical design for an Epic | Chief Architect | Draft → Approved → Implemented → Deprecated | Architecture Compliance Engine | Updated when Epic architecture changes | `docs/architecture/{epic}/` |
| **ADR** | Single architecture decision record | Chief Architect | Proposed → Accepted → Superseded | Architecture Compliance Engine | Immutable after ACCEPTED | `docs/architecture/**/adr/` |
| **Business Rules** | Domain rules (FEFO, pricing, units) | Domain Architect | Defined → Active → Amended | Risk Analysis Engine | Via ADR | Defined per module |
| **Engineering Plan** | Sprint/epic execution plan | Engineering Lead | Draft → Approved → Executed → Closed | Implementation Engine | Updated per sprint | `docs/engineering/` |
| **Knowledge Base** | Bug history + lessons learned | Engineering Lead | Open → Resolved | Knowledge Discovery Engine | Per bug resolution | `docs/bugs/` |
| **Bug Repository** | Individual bug records | Engineer | Reported → Root Cause Confirmed → Resolved | Knowledge Discovery Engine | Per bug investigation | `docs/bugs/BUG-*.md` |
| **Retrospective** | Sprint process evaluation | Engineering Lead | Draft → Complete | Knowledge Discovery Engine | Immutable after complete | `docs/engineering/*Retrospective*` |
| **War Room Report** | Multi-dimension sprint audit | Architecture Board | Draft → Approved | Knowledge Discovery Engine | Immutable after approved | `docs/engineering/*War-Room*` |
| **Definition of Done** | Completion criteria | Architecture Board | Active | All engines | Per sprint/sprint | `docs/architecture/**/DoD` |
| **Playbooks** | Reusable procedures | Engineering Lead | Draft → Active | Implementation Engine | When procedure changes | `docs/playbooks/` |
| **Templates** | Standard document formats | Engineering Lead | Active | Documentation Engine | When format changes | `docs/bugs/BUG_TEMPLATE.md` |
| **Checklists** | Mandatory gate verifications | Engineering Lead | Active | All engines | When gates change | `docs/eeos/checklists/` |

## Artifact Ownership Rules

1. Every artifact has exactly ONE owner
2. No two artifacts share the same responsibility
3. SSOT (Single Source of Truth) is the canonical location
4. Artifacts reference each other; they never duplicate
