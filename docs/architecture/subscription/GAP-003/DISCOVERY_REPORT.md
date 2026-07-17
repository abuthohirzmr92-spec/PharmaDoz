# DISCOVERY REPORT — GAP-003

## Current Flow (what exists)

### Assets fully built and available:
| Layer | Asset | Status |
|-------|-------|--------|
| **Pure helpers** | `computeNextPeriodEnd(iso, interval)` — `calc.ts` | ✅ exists, never called |
| **Pure helpers** | `computeProration(oldPrice, newPrice, daysRem, period)` — `calc.ts` | ✅ exists |
| **Pure helpers** | `applyDiscount(amount, offer)` — `calc.ts` | ✅ exists |
| **Pure helpers** | `computeUpgradeQuote(currentP, newP, days, period, offer?)` — `calc.ts` | ✅ exists |
| **Repository** | `InvoiceRepository.create(input)` — creates draft invoice | ✅ exists |
| **Repository** | `InvoiceRepository.getById(id)` — readback | ✅ exists |
| **Repository** | `SubscriptionRepository.extendPeriod(subId, newEnd)` — update period | ✅ exists, never called |
| **Repository** | `SubscriptionRepository.getCurrent(tenantId)` — current sub | ✅ exists |
| **Repository** | `SubscriptionRepository.transition(subId, tenantId, toState, opts)` → RPC | ✅ exists |
| **Repository** | `packageRepo.getPackageById(id)` — returns PackageRow | ✅ exists |
| **Repository** | `promotionRepo.getByCode(code)` — returns offer | ✅ exists |
| **Service** | `BillingService.initiatePayment(invoiceId)` — Pay Now | ✅ exists |
| **Service** | `BillingService.previewCheckout(subtotal, promoCode?)` — discount preview | ✅ exists |
| **Service** | `BillingService.recordPayment(provider, event)` — webhook processing | ✅ exists |
| **Service** | `BillingService` DIs: invoices, payments, subs, lifecycle, reminders, promotions, manager — **all injected** | ✅ exists |
| **Service** | `SubscriptionLifecycleService` — FSM engine via RPC | ✅ exists |
| **UI** | Upgrade page (`/settings/subscription/upgrade`) — picker + proration + promo preview | ✅ exists |
| **UI** | Billing page (`/settings/subscription/billing`) — Pay Now + invoice list | ✅ exists |

### Where the chain is broken:

```
UI: Upgrade page ("Ajukan Upgrade")
  → submitUpgradeRequest(toPackageId, promoCode?)  ← ⚠️ STUB
     → returns "Permintaan upgrade dicatat. Lanjutkan pembayaran di tab Tagihan."
     → NO invoice created
     → NO proration applied
     → NO charge initiated

BillingService:
  → initiatePayment(invoiceId)  ✅ exists — but only works on existing invoices
  → createUpgradeInvoice()       ❌ DOES NOT EXIST
  → createRenewalInvoice()       ❌ DOES NOT EXIST

Renewal path:
  → NO code creates renewal invoices
  → computeNextPeriodEnd()       ✅ exists — never called
  → extendPeriod()               ✅ exists — never called
  → autorenew cron               ❌ DOES NOT EXIST (GAP-006, separate)
```

## Expected Flow

### Upgrade flow:
```
Owner clicks "Ajukan Upgrade" on /settings/subscription/upgrade
  → submitUpgradeRequest(toPackageId, promoCode?)  ← server action
     → createPrivilegedBilling().createUpgradeInvoice(tenantId, subId, toPackageId, promoCode)
        → computeProration(currentPrice, newPrice, daysRemaining, periodDays)
        → applyDiscount(proration, offer) if promoCode valid
        → invoiceRepo.create({ amount: total, status: "draft", ... })
        → return { invoiceId, amount, discount, total }
     → redirect owner to Billing page with the new invoice
     → owner clicks "Pay Now" → initiatePayment(invoiceId) → provider charge
     → webhook → recordPayment → lifecycle transition
```

### Manual renewal flow (owner-initiated):
```
Owner clicks "Perpanjang" (future UI or auto-scheduler)
  → BillingService.createRenewalInvoice(subscriptionId)
     → subscriptionRepo.getCurrent(tenantId)
     → packageRepo.getPackageById(sub.packageId)
     → computeNextPeriodEnd(sub.currentPeriodEnd, pkg.billingInterval)
     → invoiceRepo.create({ amount: pkg.monthlyPrice, ... })
     → return { invoiceId, amount, newPeriodEnd }
  → initiatePayment → ... → recordPayment → extendPeriod + lifecycle transition
```

### Dependencies (already available):
```
createUpgradeInvoice() needs:
  subscriptionRepo.getCurrent(tenantId)  ✅
  packageRepo.getPackageById(id)          ✅
  computeProration()                       ✅
  promotionRepo.getByCode(code)            ✅
  calc.applyDiscount()                    ✅
  invoiceRepo.create()                     ✅

createRenewalInvoice() needs:
  subscriptionRepo.getCurrent(tenantId)  ✅
  packageRepo.getPackageById(id)          ✅
  computeNextPeriodEnd()                   ✅
  invoiceRepo.create()                     ✅
```

## Root Cause

**BillingService has ALL the injected dependencies it needs** (invoices, payments, subs, lifecycle, reminders, promotions, manager) but **`createUpgradeInvoice` and `createRenewalInvoice` methods were never implemented.** The `submitUpgradeRequest` server action is a stub. The pure calculation helpers exist but no service method composes them into invoice creation.

**No new architecture needed.** Only two new methods on the existing `BillingService`, and wiring the existing `submitUpgradeRequest` server action to call them.
