# Provider Capability Policy

Every payment provider plugin MUST declare its capabilities via
`capabilities(): ProviderCapabilities`. BillingService and the UI read
capabilities — they never assume a provider supports a method.

## Capability contract
```
ProviderCapabilities {
  methods: PaymentMethod[]     // QRIS | virtual_account | bank_transfer | e_wallet(gopay,…) | credit_card | retail_outlet | manual_transfer | ...
  supportsRefund: boolean
  supportsCancel: boolean
  supportsWebhook: boolean
  mode: 'sandbox' | 'production'
}
```

## First-class providers (declared capabilities)
| Provider | Methods | Refund | Cancel | Webhook | Mode |
|----------|---------|:------:|:------:|:-------:|------|
| **Manual** | manual_transfer | — | ✓ | — | production |
| **Flip** | qris, virtual_account, bank_transfer | ✓ | ✓ | ✓ | config |
| **Midtrans** | qris, virtual_account, gopay, credit_card | ✓ | ✓ | ✓ | config |
| **Xendit** | qris, virtual_account, retail_outlet | ✓ | ✓ | ✓ | config |

## Rules
- **Provider ≠ Method.** A method is offered *by* a provider; availability is a
  capability, not a hardcoded assumption.
- The UI shows only methods the active provider advertises.
- Refund/cancel are invoked only when the capability is true (optional interface
  methods `refund?`/`cancel?`).
- `mode` (sandbox/production) comes from Super-Admin config; providers do not
  self-decide environment in business logic.
