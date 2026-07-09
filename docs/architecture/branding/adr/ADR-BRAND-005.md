# ADR-BRAND-005 — Mandatory Platform Attribution Footer

## Status: PROPOSED

## Context

MEDISYNC is a SaaS platform. Tenants use it to run their pharmacy operations. We must balance tenant branding with platform attribution.

## Problem

Where and how should MEDISYNC platform attribution appear?

## Decision

**All invoices and receipts must include the footer:**

> "Powered by MEDISYNC® — www.medisync.id"

This footer:
- CANNOT be removed by any tenant (including Premium)
- CANNOT be modified by any tenant
- Appears on: printed receipts, digital receipts, PDF invoices, email invoices

The landing page (`medisync.id`) is MEDISYNC-branded. Tenant subdomains are tenant-branded with MEDISYNC footer attribution only on transactional documents.

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| No platform attribution | MEDISYNC loses brand visibility entirely |
| Watermark on logo | Intrusive, damages tenant brand perception |
| Attribution only on web (not print) | Print is the most visible medium |

## Consequences

- Footer text is hardcoded in the receipt/invoice templates
- Legal protection: MEDISYNC is a registered trademark
- Tenants accept this as part of the Terms of Service
