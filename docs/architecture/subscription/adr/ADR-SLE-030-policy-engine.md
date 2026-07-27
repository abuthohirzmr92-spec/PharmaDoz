# ADR-SLE-030 — Policy Engine

## Status: FUTURE (NOT IMPLEMENTED)

> This ADR documents a deliberately deferred design. It is part of the
> **Architecture Lock** for the Subscription Lifecycle Engine (SLE) but is
> **not** in the implementation scope of Phase 1–10. No table, service, or
> code exists for it yet. It is recorded so the current design stays
> compatible with it and no redesign is required when it is built.

## Context

The SLE already separates concerns cleanly: Subscription owns lifecycle,
Billing owns money, Payment owns provider, Invoice owns accounting, and
`subscription_settings` holds configuration (config-driven, versioned).

As MEDISYNC grows, business rules become more complex and cross-cutting:
- Trial: eligibility, auto-approval conditions, duration by segment
- Billing: proration mode, tax rules, currency rules
- Quota: soft vs hard enforcement, burst allowances
- Upgrade/Downgrade: allowed paths, cooldowns, proration policy
- Reminder: escalation matrix, channel selection by tenant tier

Today these rules live partly in `subscription_settings` (values) and partly
in domain services (logic). This is fine for the current scale.

## Problem

When rule complexity grows beyond simple key/value config, scattering
`if` logic across domain services will erode the "no hardcode" principle and
make rules hard to audit, test, and evolve independently.

## Decision (FUTURE)

Introduce a **Policy Engine** as a dedicated evaluation layer that sits
between configuration and the domain engines:

```
Policy Engine
  ├── Subscription Policy
  ├── Billing Policy
  ├── Trial Policy
  ├── Quota Policy
  ├── Upgrade Policy
  └── Reminder Policy
        │
        ▼
  evaluate(policyKey, context) → Decision { allow, reason, effects[] }
```

- Domain engines ask the Policy Engine for a **Decision** instead of embedding
  branching business logic.
- Policies are declarative and versioned (reuse `subscription_settings`
  versioning with `effective_from`/`effective_until`).
- The engine is pure and side-effect free — it returns decisions; the caller
  applies effects (keeping the SLE FSM as the single mutator).

## Relationship to the current design

The current architecture is **forward-compatible** with this:
- `subscription_settings` (versioned) is the natural policy store.
- The SLE Engine already centralizes transitions — policies would be consulted
  inside existing guard hooks (Extension Points, ADR-39), not a new mutator.
- `CapabilitySnapshot` and the Event Ledger already provide the evaluation
  context and the audit trail a Policy Engine would need.

Therefore no bounded context is added now; this is a future refinement of the
existing guard/config layers.

## Alternatives Considered

| Alternative | Rejected (for now) Because |
|-------------|----------------------------|
| Build Policy Engine in Phase 1 | Premature; current rules fit config + guards. Adds scope without present need. |
| Embed all rules in services | Erodes "no hardcode" as complexity grows — this ADR exists to prevent that path later. |
| External rules engine (e.g. OPA) | Operational overhead not justified at current scale; revisit if rules become truly dynamic. |

## Consequences

- **Now:** none. Documentation only. Keeps the team aware not to hardcode
  complex rules into services — push them toward `subscription_settings` +
  guard hooks so a future Policy Engine can absorb them cleanly.
- **Later:** when rule complexity crosses the threshold, implement the engine
  consuming existing config + context; expected to require zero schema redesign.

## Trigger to revisit

Promote this ADR from FUTURE to PROPOSED when any two of the following hold:
1. A single domain service accumulates > ~5 distinct rule branches.
2. Rules must differ per tenant segment/plan at runtime.
3. Non-engineers need to author/adjust rules without a deploy.
