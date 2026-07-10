# EEOS Checklists

Mandatory verification checklists for EEOS gates.

## Architecture Compliance Checklist

- [ ] Architecture Constitution reviewed
- [ ] Relevant ADRs identified
- [ ] Blueprint consulted
- [ ] 18 Invariants verified
- [ ] 15 Principles verified
- [ ] Dependency rules checked

## Implementation Gate Checklist

- [ ] TypeScript: 0 errors
- [ ] Build: PASS
- [ ] Tests: all PASS
- [ ] Architecture: 0 violations
- [ ] No scope creep
- [ ] Documentation updated (if needed)

## Release Gate Checklist

- [ ] All implementation gates passed
- [ ] Regression: no failures
- [ ] Hardening: complete
- [ ] Manual QA: PASS
- [ ] Working tree clean

## Pre-Push Checklist

- [ ] TypeScript: 0 errors
- [ ] Build: PASS
- [ ] Tests: all PASS
- [ ] Architecture grep: clean
- [ ] No debug/trace code in src/
- [ ] Commit message follows convention
