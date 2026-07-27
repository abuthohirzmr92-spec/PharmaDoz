# Money Type Policy

## Canonical representation
All monetary values flow through the **Money layer** (`src/lib/billing/calc.ts`
and, going forward, BillingService). The primitive representation is an
**implementation detail** of that layer.

- **Today:** money is a JS `number` (currency minor units handled by `round2`).
- **Tomorrow:** may evolve to `decimal` (big.js/decimal.js) or integer **cents**
  for exact arithmetic — without touching business logic.

## Rules
1. Business logic performs **no raw money arithmetic**. It calls Money-layer
   helpers (`computeProration`, `applyDiscount`, `computeOutstanding`, …).
2. No code outside `src/lib/billing/` may `+ - * /` monetary amounts.
3. Rounding is centralized (`round2`) so a future representation swap changes one
   place.
4. Repositories and gateways treat amounts as **opaque values to store/transmit**,
   never to compute (Money Rule).

## Consequence
Swapping `number` → `decimal`/`cents` later is a localized change inside the
Money layer; callers remain unchanged. No schema change is implied by this
policy.
