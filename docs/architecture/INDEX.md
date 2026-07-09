# MEDISYNC — Architecture Index

## Active Packages

| Package | Status | Location |
|---------|:------:|----------|
| **Checkout Architecture** | ✅ IMPLEMENTED | `V10.1-checkout-session-blueprint.md` |
| **Architecture Governance** | ✅ ACTIVE | `README.md`, `GOVERNANCE.md` |
| **Sales Unit Policy** | 📋 ADR-PROPOSED | `ADR-006-Sales-Unit-Policy.md` |
| **Revenue / HPP / Profit** | ✅ VERIFIED | `Revenue-HPP-Profit-Source-Of-Truth-Audit.md` |

## Draft Packages

| Package | Status | Location |
|---------|:------:|----------|
| **Branding Foundation** | ✍️ DRAFT | `branding/` |
| **Performance Foundation** | ✍️ DRAFT | `performance/` |

## Future Packages

| Package | Priority | Dependencies |
|---------|:--------:|-------------|
| Security Foundation | P0 | Branding, Performance |
| Customer Portal | P1 | Branding, Security |
| API Platform | P1 | Security |
| Clinic Module | P2 | Customer Portal |
| Laboratory Module | P2 | Customer Portal |
| Mobile Platform | P2 | API Platform |
| Marketplace | P3 | API Platform |

## ADR Index

| ADR | Title | Status |
|-----|-------|:------:|
| ADR-001 | CheckoutSession as Aggregate Root | ACCEPTED |
| ADR-002 | Allocation separated from Pricing | ACCEPTED |
| ADR-003 | FEFO remains Pure Domain Service | ACCEPTED |
| ADR-004 | Pricing as separate Bounded Context | ACCEPTED |
| ADR-005 | Evolutionary Refactor | ACCEPTED |
| ADR-006 | Sales Unit Policy | PROPOSED |
| ADR-007 | Product Catalog Independence | ACCEPTED |
| ADR-BRAND-001 | Hostname-Based Brand Resolution | PROPOSED |
| ADR-BRAND-002 | Content-Hash Fingerprinted URLs | PROPOSED |
| ADR-BRAND-003 | Server-Side Asset Processing (Sharp) | PROPOSED |
| ADR-BRAND-004 | Single Upload → Multi-Asset Pipeline | PROPOSED |
| ADR-BRAND-005 | Mandatory Platform Attribution Footer | PROPOSED |
| ADR-PERF-001 | Cursor-Based Server Pagination | PROPOSED |
| ADR-PERF-002 | Virtual Scrolling via @tanstack/react-virtual | PROPOSED |
| ADR-PERF-003 | Single DataTable Component | PROPOSED |

## Status Legend

| Symbol | Status | Meaning |
|:------:|--------|---------|
| ✅ | IMPLEMENTED | Deployed to production |
| ✅ | ACTIVE | Currently in effect |
| ✅ | VERIFIED | Audited and confirmed correct |
| ✍️ | DRAFT | Under active design |
| 📋 | PROPOSED | Awaiting Architecture Board approval |
| 🔮 | FUTURE | Planned, not yet started |
