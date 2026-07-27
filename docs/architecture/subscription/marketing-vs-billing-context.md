# Bounded Context — Marketing Engine vs Billing Engine

## Status: ACCEPTED (Architecture Lock clarification)

> Clarifies the responsibility boundary between the Marketing Engine and the
> Billing Engine. No implementation change — this pins the contract so future
> work does not blur the two.

## Principle

> **Marketing defines offers. Billing calculates money.**

## Ownership

```
┌─ MARKETING ENGINE ─────────────┐        ┌─ BILLING ENGINE ──────────────────┐
│ Owns: OFFERS                   │        │ Owns: MONEY                        │
│                                │        │                                    │
│ • Promotions (code, %/fixed/   │        │ • Discount Resolution              │
│   trial_extension)             │        │   (apply eligible offers to a cart)│
│ • Coupons          [future]    │        │ • Invoice Calculation              │
│ • Referral         [future]    │        │   (line items, tax, totals)        │
│ • Affiliate        [future]    │        │ • Final Price                      │
│ • Campaign         [future]    │        │   (the amount actually charged)    │
│                                │        │                                    │
│ Answers: "what offers exist    │        │ Answers: "given these offers, what │
│ and are they valid?"           │        │ does the customer pay?"            │
└────────────────┬───────────────┘        └───────────────┬────────────────────┘
                 │  provides validated offer(s)            │
                 └────────────────────────────────────────▶│
                        (Marketing → Billing, one-way)
```

## Contract

- Marketing exposes: `resolveOffer(code, context) → Offer | invalid` and
  eligibility rules (validity window, plan restriction, redemption limits).
- Billing consumes an **already-validated** Offer and computes the invoice.
  Billing never decides *whether* an offer is valid — it only applies the
  discount math and produces the final price + invoice.
- Redemption recording (`promotion_redemptions`, deferred) is written by Billing
  at the moment of a successful charge, then reported back to Marketing for
  `redeemed_count`.

## Why this separation

- **Single responsibility:** offer rules evolve (referral, affiliate, campaigns)
  without touching invoice math; tax/pricing changes don't touch offer logic.
- **Auditability:** the money trail (invoices/payments) stays in Billing;
  the offer trail stays in Marketing.
- **Testability:** discount resolution is a pure function of (offer, cart).

## Boundary rule

The Billing Engine must NOT contain promotion/coupon/referral business rules,
and the Marketing Engine must NOT compute invoices, tax, or final price.
