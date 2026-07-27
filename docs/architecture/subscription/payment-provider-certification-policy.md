# Payment Provider Certification Policy

Every payment provider progresses through maturity levels. A provider may only
be enabled for real tenant payments once **Certified**.

## Maturity levels
```
EXPERIMENTAL   code exists; capabilities declared; not for real payments
     ↓
SUPPORTED      sandbox-validated; webhook verify+parse proven; enabled in non-prod
     ↓
CERTIFIED      staging-validated end-to-end; eligible for production `payment.providers.active`
```

## Minimum requirements per level
| Requirement | Experimental | Supported | Certified |
|-------------|:-----------:|:---------:|:---------:|
| Capabilities declared (`capabilities()`) | ✓ | ✓ | ✓ |
| Unit tests (parse/status/signature) | ✓ | ✓ | ✓ |
| Sandbox createPayment validated | — | ✓ | ✓ |
| Webhook signature/token verification validated | — | ✓ | ✓ |
| Webhook parsing → correct canonical status | — | ✓ | ✓ |
| Retry behavior validated | — | — | ✓ |
| Refund validated (if `supportsRefund`) | — | — | ✓ |
| Cancel validated (if `supportsCancel`) | — | — | ✓ |
| Staging end-to-end (charge → webhook → invoice paid → lifecycle) | — | — | ✓ |
| Idempotency under duplicate webhooks | — | — | ✓ |

## Current status (authored)
| Provider | Level |
|----------|-------|
| Manual | SUPPORTED (no external calls; needs staging sign-off → Certified) |
| Flip | EXPERIMENTAL (capabilities + webhook verify/parse; live charge pending) |
| Midtrans | EXPERIMENTAL |
| Xendit | EXPERIMENTAL |

## Rules
- Only **Certified** providers may appear in production `payment.providers.active`.
- Certification is per-environment credentials + the checklist above.
- Future providers (Stripe/Tripay/Duitku/DOKU/…) follow the identical process —
  no BillingService change (Provider Neutral Policy).
