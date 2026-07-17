# IMPLEMENTATION PLAN — GAP-003

## Files to modify

| # | File | Change | Risk |
|---|---|---|---|
| 1 | `src/lib/services/billing-service.ts` | Add `createUpgradeInvoice()` + `createRenewalInvoice()` methods | LOW |
| 2 | `src/app/(tenant)/settings/subscription/upgrade/actions.ts` | Replace stub `submitUpgradeRequest` with real invoice creation via privileged BillingService | LOW |

## No new files. No new repositories. No new RPCs. No schema changes.

## Dependency graph

```
createUpgradeInvoice()
  ├── subscriptionRepo.getCurrent(tenantId)     ← existing, Phase 2
  ├── packageRepo.getPackageById(id)             ← existing
  ├── calc.computeProration(old, new, days, period) ← existing
  ├── promotionRepo.getByCode(code) if promo     ← existing
  ├── calc.applyDiscount(amount, offer) if promo ← existing
  └── invoiceRepo.create(input)                  ← existing

createRenewalInvoice()
  ├── subscriptionRepo.getCurrent(tenantId)     ← existing
  ├── packageRepo.getPackageById(id)            ← existing
  ├── calc.computeNextPeriodEnd(end, interval)  ← existing
  └── invoiceRepo.create(input)                 ← existing
```

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Invoice creation already exists (duplicate code) | LOW | `InvoiceRepository.create()` is the single writer; new methods compose existing helpers |
| `startDate` needed for proration but not available on subscription | LOW | Use `currentPeriodStart` from subscription; fallback 30 days |
| Package `billingInterval` may be NULL | LOW | Default to `"month"` |
| Server action needs privileged client for invoice INSERT (RLS super_admin only) | LOW | Use `createPrivilegedBilling()` — same pattern as `payInvoice` in billing actions |
| Promo code invalid → should still allow invoice creation | LOW | Promo is optional; invoice is created at full price if promo invalid |

## Rollback

- Remove `createUpgradeInvoice` + `createRenewalInvoice` from BillingService
- Revert `submitUpgradeRequest` to stub
- Zero data loss — invoices are additive, created as draft
