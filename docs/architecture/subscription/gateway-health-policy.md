# Gateway Health Policy

Defines provider health states and the (future) failover strategy. No
implementation now — this pins the model so PaymentProviderManager can evolve.

## Health states
```
HEALTHY      normal — accepting payments, webhooks flowing
   ↓ (elevated error rate / latency / partial outage)
DEGRADED     usable but unreliable — prefer alternatives, keep as fallback
   ↓ (auth failure / provider down / repeated 5xx)
UNAVAILABLE  do not route new payments here
```

## Signals (future)
- Recent createPayment success rate, webhook delivery, status-lookup latency.
- Explicit Super-Admin toggle (enable/disable, health override).

## Failover strategy (future)
- `PaymentProviderManager` selects among **active** providers by priority
  (config `payment.providers.active`), skipping `UNAVAILABLE` ones.
- A `DEGRADED` provider stays selectable only if no `HEALTHY` alternative exists.
- Failover is **selection-time** only; an in-flight payment is never silently
  re-routed (idempotency + provider reference are preserved).
- Manual is the ultimate fallback (always available).

## Ownership
- Health is owned by `PaymentProviderManager` (selection concern), informed by
  observability metrics — NOT by BillingService and NOT by adapters.
- No schema change; health can be tracked in memory / config first.
