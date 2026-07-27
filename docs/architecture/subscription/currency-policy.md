# Currency Policy

## Rule
**BillingService must never hardcode `IDR`** (or any currency) in business logic.
Currency is obtained from configuration via `SettingsRepository`.

- Setting key: `billing.currency` (JSONB `{ "code": "IDR" }`).
- **Current default:** `IDR` (fallback when the setting is absent).
- **Future:** fully configuration-driven (per-platform, later possibly per-region).

## Application
- BillingService reads the currency from `SettingsRepository.getString("billing.currency", "code", "IDR")`
  and passes it to invoices/payments/providers.
- Repositories keep a **storage-level** default of `IDR` purely as a safety
  fallback for direct inserts; the authoritative currency is supplied by
  BillingService per the setting.
- Payment providers receive the currency; they never choose it.

## No schema change
`invoices.currency` / `payments.currency` already exist. This policy adds a
config key only — no migration, database remains FROZEN.
