# EEOS Governance Policy

Official governance policy, effective **Phase 2 onward**.

## Phase Status

| Layer | Status | Meaning |
|-------|--------|---------|
| **Architecture** | 🔒 LOCKED | Blueprint frozen; changes only via Change Request |
| **Database** | 🧊 FROZEN | No redesign / schema / migration changes unless Bug Fix or approved Change Request |
| **Repository** | 🟢 OPEN | Phase 2 may proceed (batch review) |
| **Application** | ⏳ WAITING | Not started |
| **Deployment** | ⏳ WAITING | Not started |

## Database Freeze Rule

The database is FROZEN. No schema change, migration change, or redesign is
permitted **unless** one of:
1. **Bug Fix** — corrects a defect in an existing migration/object.
2. **Approved Change Request** — see template below, approved by Product Owner.

No schema modification proceeds without explicit Product Owner approval.

## Repository Review Model (Phase 2)

Repositories use **Batch Review**, not repository-by-repository review:

```
Batch (e.g. 2A)  →  Validation (per unit: typecheck + eslint + unit tests)
                 →  Batch Summary
                 →  Product Owner Review
```

- Validation still runs after **each** unit inside the batch.
- Product Owner approval happens **once per batch**, at the Batch Summary.
- Runtime / integration validation remains **PENDING** until executed against
  the staging database.
- **No commit without Product Owner approval.**

## Change Request Requirement

Any future work that requires modifying the database MUST first raise a
**Change Request** (see `CHANGE-REQUEST-TEMPLATE.md`) containing: Reason,
Impact, Alternatives, Risk, Recommendation — and be approved before any
schema/migration change is authored.

## Standing Principles (unchanged)

Reuse First · Zero Duplicate Logic · Additive Migration · Repository Pattern ·
Domain-Driven Design · No Hardcode · Configuration Driven · Runtime validation
never assumed · No commit without Product Owner approval.
