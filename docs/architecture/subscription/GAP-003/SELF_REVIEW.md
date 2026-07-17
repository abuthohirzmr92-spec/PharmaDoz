# SELF REVIEW — GAP-003

## Architecture Review

| Check | Result | Details |
|-------|:---:|------|
| Single Billing Engine | ✅ PASS | `BillingService` is the only billing engine |
| No new Repository | ✅ PASS | Uses existing `InvoiceRepository`, `PaymentRepository`, `SubscriptionRepository`, `PromotionRepository` |
| No new RPC | ✅ PASS | No RPCs added |
| No new table | ✅ PASS | No schema changes |
| No new migration | ✅ PASS | Database FROZEN |
| Reuse existing pure helpers | ✅ PASS | `computeUpgradeQuote`, `computeNextPeriodEnd`, `applyDiscount` |
| Reuse existing service | ✅ PASS | `BillingService` extended, not replaced |

## Runtime Review

| Check | Result |
|-------|:---:|
| `createUpgradeInvoice()` — upgrade path | ✅ Creates draft invoice with proration + optional discount |
| `createRenewalInvoice()` — renewal path | ✅ Creates draft invoice at package price with next period end |
| `submitUpgradeRequest` wired | ✅ Calls `createPrivilegedBilling().createUpgradeInvoice()` |
| Proration correct | ✅ Uses `computeUpgradeQuote` (Money layer) |
| Discount correct | ✅ Uses `applyDiscount` (Money layer) |
| Invoice number unique | ✅ App-generated timestamp-based, UNIQUE constraint on DB |
| Promo optional | ✅ Invoice created at full price if promo invalid/absent |

## Repository Review

| Check | Result |
|-------|:---:|
| Invoice writes via `InvoiceRepository.create()` | ✅ |
| Package reads via `packageRepo.getPackageById()` | ✅ |
| Subscription reads via `subscriptionRepo.getCurrent()` | ✅ |
| Promotion reads via `promotionRepo.getByCode()` | ✅ |
| No direct Supabase queries | ✅ |

## Transaction Review

| Check | Result |
|-------|:---:|
| Invoice creation atomic? | No — single INSERT, not multi-table. Acceptable for draft invoices. |
| If invoice creation fails, is anything corrupted? | No — returns error, no side effects |
| If invoice created but payment not initiated, is state inconsistent? | No — draft invoice is an explicit pending-billing state |

## Single Writer Review

| Check | Result |
|-------|:---:|
| `invoiceRepo.create()` is sole invoice writer | ✅ (except legacy `packageRepo.createInvoice` used by ManualGateway — Phase 5 debt) |
| `subscription_transition` RPC is sole lifecycle writer | ✅ — not modified here |
| Money Rule preserved | ✅ — all amounts from Money layer (`computeUpgradeQuote`, `applyDiscount`) |

## Duplicate Logic Review

| Check | Result |
|-------|:---:|
| Any duplicate of existing invoice creation? | ✅ No — uses `InvoiceRepository.create()` which is the canonical writer |
| Any duplicate of proration? | ✅ No — delegates to `computeUpgradeQuote` |
| Any duplicate of discount? | ✅ No — delegates to `applyDiscount` |
| Any duplicate of period calculation? | ✅ No — delegates to `computeNextPeriodEnd` |

## Risk Analysis

| Risk | Level | Mitigation |
|------|-------|------------|
| `billingInterval` not typed on `PackageRow` | LOW | Dynamic access via `Record<string, unknown>`; default "month" |
| Invoice number collision | LOW | `invoice_number UNIQUE` on DB → collision-safe retry |
| Tenant tries to upgrade without active subscription | LOW | `getCurrent()` returns null → early exit with error |
| Upgrade to same package | LOW | UI filters out current package from options |
| TypeScript regression | PASS | `tsc --noEmit` passes |

## Final Verdict

### ✅ GAP-003 RESOLVED

**Files changed:** 3 (2 service + 1 UI page)
**New methods:** 2 (`createUpgradeInvoice`, `createRenewalInvoice`)
**Server action rewired:** 1 (`submitUpgradeRequest` → privileged billing)
**No new architecture, no new schemas, no data migration.**
