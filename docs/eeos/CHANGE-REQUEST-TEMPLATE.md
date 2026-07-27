# EEOS Change Request (Template)

> Required before ANY database schema/migration change while the Database is
> FROZEN. Copy this template, fill it in, and obtain Product Owner approval
> before authoring changes.

---

## CR-<id>: <short title>

- **Date:**
- **Requested by:**
- **Layer affected:** (Database / Architecture / …)
- **Type:** Bug Fix | Change Request

### Reason
Why is the change needed? What breaks or is blocked without it?

### Impact
- Tables / columns / constraints / functions affected:
- Data affected (row counts, backfill needed?):
- Downstream: repositories / services / RLS / RPC / UI:
- Source-of-Truth matrix effect (does an SoT flip / legacy removal shift?):

### Alternatives
Options considered and why they were not chosen (include "do nothing").

### Risk
- Classification: LOW / MEDIUM / HIGH
- Zero-downtime? Reversible? Backfill idempotent?
- Rollback plan:

### Recommendation
Proposed action + migration number(s) + execution/validation gate plan.

---

### Product Owner Decision
- [ ] Approved  - [ ] Rejected  - [ ] Needs revision
- Notes:
