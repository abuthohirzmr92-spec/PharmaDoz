# Phase 6 — Owner Subscription Portal (Discovery)

Application phase. Reuse-first. Consume the existing Billing Engine — NO backend,
repository, domain, or database redesign. Database FROZEN. Runtime PENDING at staging.

## 1. Information Architecture
Consolidate the 10 requested capabilities into **6 primary tabs** (fewer tabs =
better UX) under one portal, mirroring the existing `config/layout.tsx` sub-nav.

```
/settings/subscription  (Owner Subscription Portal — child of Settings sidebar group)
├── Overview        ⭐ THE SUBSCRIPTION DASHBOARD (owner-first, 3-second rule) — see §1a
├── Plans           current package · compare (features/services/limits) · usage · upgrade recommendation
│    └── Upgrade     choose package · proration preview · estimated cost · promo preview · upgrade request
├── Billing         Invoices (active/history/detail/download) · Payments (Pay Now/status/history/
│                    timeline/provider info/retry) · Promotions (available/active/history/discount)
├── Usage           quota dashboard (users/branches/cashiers/products/customers/suppliers/storage/AI/API)
├── Activity        subscription timeline (event ledger) · notifications (renewal/reminder/grace/suspension)
└── Settings        billing contact · tax info · company info · subscription preferences
```

## 1a. Overview = Subscription Dashboard (Owner-First · 3-Second Rule)
The portal is a **customer-facing** subscription experience, not an admin system.
Every decision answers "what does the tenant owner need first?" The Overview is
the **dashboard**: within ~3 seconds the owner understands the subscription state
and can act without navigating away.

**Above-the-fold elements (priority order):**
1. **Subscription Health** — one prominent status (Healthy / Trial / Grace / Read-Only / Suspended / Lifetime / Enterprise), color-coded via `fsm.deriveAccessGate` + lifecycle_state. Reuse `subscription-badge`.
2. **Next Action Card** — one intelligent card (see below).
3. **Current Package** + **Remaining Days** + **Renewal Date** + **Billing Cycle** + **Auto-Renew** status.
4. **Quota Summary** — top resources at a glance (reuse `quota-progress`).
5. **Active Invoice** — if any unpaid/overdue, with amount + Pay Now.
6. **Quick Actions** — Pay Now · Upgrade Package · Download Latest Invoice · Contact Support (no navigation to Billing needed for common actions).
7. **Current Benefits** — "what's included in my package?" (features + services).
8. **Recent Activity** — latest subscription events inline.

### Next Action Card (intelligent, NO new business logic)
A single card driven by a **pure view-model helper** `deriveNextAction(ctx)` that
reads ALREADY-COMPUTED state (lifecycle_state, trial_end/current_period_end,
active invoice status) and returns a message + CTA. Examples:
`Trial expires tomorrow → Upgrade` · `Renew within 5 days → Pay Now` ·
`Invoice overdue → Pay Now` · `Grace period active → Pay Now` ·
`Upgrade recommended (quota near limit) → Compare Plans` · `All good → (none)`.
It consumes existing `SubscriptionRepository` + `InvoiceRepository` + `QuotaRepository`
outputs; the helper is pure and unit-testable. **No domain/service logic added.**

### Current Benefits (reuse)
`FeatureResolver.getEnabledFeatures(tenantId)` + `serviceCatalogRepo` (service→feature
labels) → grouped benefit list. No duplication of feature logic.

### Recent Activity (reuse)
`subscriptionRepo.getTimeline(tenantId)` (from `subscription_events`), showing the
latest N nodes inline; "View all" → Activity tab.

## 2. Page Hierarchy (routes)
```
/settings/subscription                      → Overview
/settings/subscription/plans                → Plans (compare)
/settings/subscription/upgrade              → Upgrade Center
/settings/subscription/billing              → Invoices + Payments + Promotions (tabbed)
/settings/subscription/usage                → Quota Dashboard
/settings/subscription/activity             → Timeline + Notifications
/settings/subscription/settings             → Account & Billing Settings
```
Portal uses a `subscription/layout.tsx` sub-nav (same pattern as `config/layout.tsx`).

## 3. Sidebar Integration
Add a **5th child** to the existing Settings group in `config/tenant-navigation.ts`:
`{ label: "Langganan", href: "/settings/subscription", icon: CreditCard, permission: "billing.view" }`.
No new sidebar mechanics (tree already supports children). Owner-gated by `billing.view` (tenant_owner has it).

## 4. Component Breakdown
- **Shell:** `subscription/layout.tsx` (sub-nav) — new, mirrors config layout.
- **Overview (Dashboard):** `SubscriptionHealthHero` (reuse `subscription-badge`), `NextActionCard` (+ pure `deriveNextAction`), `CurrentPlanCard`, `RenewalSummary`, `QuotaSummary` (reuse `quota-progress`), `ActiveInvoiceCard`, `QuickActions` (Pay Now/Upgrade/Download Invoice/Contact Support), `BenefitsList`, `RecentActivity`.
- **Plans:** `PlanComparisonMatrix` (features×services×limits), `UpgradeRecommendation`.
- **Upgrade:** `PackagePicker`, `ProrationPreview`, `PromoInput`, `UpgradeRequestButton`.
- **Billing:** `InvoiceList`, `InvoiceDetail`, `PayNowButton`, `PaymentHistory` (reuse `payment-history-table`), `PaymentTimeline`, `ProviderInfo`, `PromotionList`.
- **Usage:** `QuotaDashboard` (reuse `quota-progress` per resource).
- **Activity:** `SubscriptionTimeline`, `NotificationList`.
- **Settings:** `BillingSettingsForm`.

## 5. Data Source Mapping (each section → repo/service)
| Section | Reads (user client / RLS) | Writes (server action, privileged) |
|---|---|---|
| Overview (Dashboard) | `subscriptionRepo.getCurrent` + `.getTimeline` (recent), `quotaRepo.listUsage`, `invoiceRepo.listByTenant` (active), `FeatureResolver.getEnabledFeatures` + `serviceCatalogRepo` (benefits), `fsm.deriveAccessGate`, pure `deriveNextAction` | Quick Actions → server actions (Pay Now / Upgrade) |
| Plans | `packageRepo` (packages), `serviceCatalogRepo` (services→features), `FeatureResolver.getEnabledFeatures`, `quotaRepo` (limits+usage), `addonRepo` | — |
| Upgrade | `packageRepo`, `calc.computeProration`, `billingService.previewCheckout` (promo) | `billingService.createUpgradeInvoice` (server action) |
| Invoices | `invoiceRepo.listByTenant` / `getById` | — |
| Payments | `paymentRepo.listBySubscription`, `paymentProviderManager` (active provider **info only**), `retry-engine`/config | `billingService`+`PayNow` (createPayment via manager) — **server action** |
| Usage | `quotaRepo.getUtilization/listUsage`, `resource_definitions` | — |
| Timeline | `subscriptionRepo.getTimeline` (`subscription_events`) | — |
| Promotions | `promotionRepo.listActive/getByCode`, `billingService.previewCheckout` | (redemption on payment) |
| Notifications | `reminderRepo` (`notification_log`) | — |
| Settings | `tenants.settings` (billing contact/tax/company), currency policy | update `tenants.settings` (server action) |

> **Tenant NEVER chooses a provider.** "Pay Now" calls BillingService → PaymentProviderManager selects. UI shows active-provider *info* + supported methods (capabilities) only.

## 6. Reuse Matrix
| Component | Status |
|---|---|
| `subscription-badge`, `payment-history-table`, `quota-progress` | **Existing** (reuse) |
| `AppCard`, `AppBadge`, `Container`, config sub-nav pattern | **Existing** (reuse) |
| `FeatureResolver`, `QuotaRepository`, `SubscriptionRepository`, `InvoiceRepository`, `PaymentRepository`, `PromotionRepository`, `PaymentProviderManager`, `BillingService`, `calc` | **Existing** (consume as-is) |
| `billingService.createUpgradeInvoice` | **Extended** (add thin method on frozen schema — invoice create exists) |
| Portal layout + section pages + view components | **New** (UI only) |
| `deriveNextAction` (Next Action Card view-model) | **New** (pure helper; no domain logic) |
| server actions (Pay Now / Upgrade / Billing settings write) | **New** (thin, privileged via `billing-factory`) |

## 7. Risk Assessment
| # | Risk | Mitigation |
|---|---|---|
| R1 | Owner writes (invoice/pay) blocked by RLS (INSERT super_admin only) | Route owner write flows through **server actions** using the privileged billing factory (like provisioning); reads stay on the user client |
| R2 | Upgrade "create invoice + charge" partly gated by CR-002 (proration event/period) | Preview (proration/promo) works now; invoice creation works; live charge = staging creds; renewal-event = CR-002 (deferred) |
| R3 | Live payment providers not certified (Experimental) | UI enables **Manual** first; external providers behind certification |
| R4 | Provider info leakage of internal selection | Show capabilities/methods only; never expose selection logic to tenant |
| R5 | Notification read (`notification_log`) volume | paginate; read own-tenant via RLS |
| R6 | Duplicate/ambiguous "Subscription" vs existing "Keuangan" menus | Place under Settings group as "Langganan"; distinct from operational finance |

## 8. Implementation Plan (batches — UI, reuse-first)
- **6A** Portal shell + sidebar child + **Overview = Subscription Dashboard** (owner-first, 3-second rule): health hero, Next Action Card (pure `deriveNextAction`), current package/renewal, quota summary, active invoice, Quick Actions, current benefits, recent activity. Reads via user client; Quick-Action writes via server actions.
- **6B** Plans + comparison matrix + Upgrade preview (proration/promo; upgrade request = server action stub).
- **6C** Billing: Invoices + Payments + Pay Now (server action, Manual first) + Promotions.
- **6D** Usage (Quota Dashboard) + Activity (Timeline + Notifications).
- **6E** Account & Billing Settings.

Each batch: read-first via user client; write via privileged server actions; reuse existing components; unit-test pure view-model mappers; `tsc`/eslint; runtime PENDING. Gated per EEOS: implement → validate → batch summary → PO review.
