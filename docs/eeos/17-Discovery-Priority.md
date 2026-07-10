# EEOS v2.1 — Discovery Priority

## Deterministic Discovery Order

EEOS must never randomly inspect documents. The order is fixed.

```
1. Architecture Constitution
   WHY FIRST: Supreme authority. Every other document must comply.
   If Constitution prohibits a decision, stop immediately.

2. Architecture Blueprint
   WHY SECOND: Blueprint defines the target architecture for the Epic.
   Implementation must match blueprint design.

3. ADRs
   WHY THIRD: ADRs contain specific decisions. Must verify no conflict
   with existing decisions before proceeding.

4. Business Rules
   WHY FOURTH: Domain rules define correct behavior. Any change must
   preserve business rules (FEFO, pricing, unit conversion).

5. Knowledge Base
   WHY FIFTH: Prior bugs and lessons learned prevent repeating mistakes.
   Search KB before implementing, not after.

6. Bug Repository
   WHY SIXTH: Specific bug records for the affected module. Related bugs
   inform implementation patterns and tests.

7. Retrospectives
   WHY SEVENTH: Process improvements from prior sprints. Apply lessons
   learned to current implementation approach.

8. Feature Specification
   WHY EIGHTH: Product Owner requirements. Read LAST because
   architecture constraints shape HOW the feature is built.
```

## Priority Rationale

Architecture constraints are fixed. Feature requirements adapt to architecture. If architecture says "no direct DB access from UI", the feature specification must work within that constraint. Feature specification never overrides architecture.

## Discovery Output Format

```json
{
  "constitution": { "reviewed": true, "violations": [] },
  "blueprint": { "section": "FASE 8", "compliant": true },
  "adrs": ["ADR-001", "ADR-002"],
  "business_rules": ["FEFO", "Pricing"],
  "knowledge_base": { "related_bugs": ["BUG-INV-REV-001"] },
  "bugs": [],
  "retrospectives": ["V10.2-Retrospective.md"],
  "feature_spec": "Read from Product Owner request"
}
```
