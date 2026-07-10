# EEOS v2.3 — Repository Health Model

## Purpose

Define measurable engineering health metrics. Health is checked periodically, not per execution.

## Health Metrics

| Metric | Measurement | Healthy | Warning | Critical | Action |
|--------|------------|:-------:|:-------:|:--------:|--------|
| **Architecture Health** | % of Blueprint sections implemented | ≥80% | 60–79% | <60% | Prioritize implementation |
| **Documentation Health** | % of packages with complete docs (PRD + Blueprint + ADR + Risk + DoD) | ≥90% | 70–89% | <70% | Complete missing docs |
| **Governance Health** | % of policies with enforcement rules | 100% | 90–99% | <90% | Define missing enforcement |
| **Knowledge Health** | Bug-to-resolution ratio (resolved / total) | ≥90% | 70–89% | <70% | Prioritize bug fixes |
| **Technical Debt Health** | P0+P1 debt items / total debt | <10% | 10–25% | >25% | Resolve P0/P1 debt |
| **Repository Consistency** | % of cross-references that resolve | 100% | 95–99% | <95% | Fix broken references |
| **Engineering Maturity** | Composite of all above (weighted average) | ≥85 | 65–84 | <65 | Architecture Board review |

## Engineering Maturity Score

```
Maturity = (Architecture × 0.25) + (Documentation × 0.20) + (Governance × 0.20)
         + (Knowledge × 0.15) + (Debt × 0.10) + (Consistency × 0.10)

MATURE:       ≥85 — Ready for automation, can govern itself
ESTABLISHED:  65–84 — Solid foundation, needs targeted improvements
DEVELOPING:   45–64 — Gaps exist, prioritize documentation and governance
IMMATURE:     <45 — Significant architecture debt, requires dedicated sprint
```

## Health Check Frequency

- Per sprint closure: Documentation Health, Knowledge Health
- Per Epic completion: Architecture Health
- Monthly: Governance Health, Technical Debt Health
- On-demand: Repository Consistency (after major refactors)
