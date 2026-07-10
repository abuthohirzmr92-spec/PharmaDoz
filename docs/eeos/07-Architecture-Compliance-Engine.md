# EEOS v2.0 — Architecture Compliance Engine

## Responsibility

Verify that every implementation proposal complies with the Architecture Constitution before implementation begins.

## Compliance Checklist

### Constitution
- [ ] Architecture Constitution v1.0 reviewed
- [ ] No violation of Articles I-X

### ADR
- [ ] Relevant ADRs identified
- [ ] No conflict with existing ADRs
- [ ] New ADR created if required

### Blueprint
- [ ] Blueprint consulted
- [ ] Implementation matches blueprint design
- [ ] No unauthorized design changes

### Invariants
- [ ] 18 Architecture Invariants verified
- [ ] No new invariant violations

### Principles
- [ ] 15 Engineering Principles verified
- [ ] Architecture First, SSOT, Backward Compat, Pure Domain Services

### Dependency Rules
- [ ] Domain → Infrastructure: prohibited
- [ ] Presentation → Repository: prohibited
- [ ] Allowed dependencies mapped

### Non-Compliance

If any check fails, the engine returns BLOCKED with specific violations. Implementation cannot proceed until resolved.

## Output

```json
{
  "compliant": true,
  "violations": [],
  "adrs_consulted": ["ADR-001", "ADR-002"],
  "new_adr_required": false,
  "blueprint_section": "FASE 8"
}
```
