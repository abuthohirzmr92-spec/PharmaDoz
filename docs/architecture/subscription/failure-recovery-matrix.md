# Failure Recovery Matrix (Operational Recovery Guide)

Per domain service: failure points and how the system recovers. Official
operational reference for later phases.

## ProvisionTenantService
| Failure Point | Retry Policy | Rollback Strategy | Compensation | Manual Intervention |
|---------------|-------------|-------------------|--------------|---------------------|
| `provision_tenant` RPC fails | none (atomic) | DB auto-rolls back all writes | caller deletes the pre-created auth user | If auth-user cleanup fails → manual delete |
| Post-RPC reminder scheduling fails | reminder-level retry | none (tenant already live) | log to `notification_log`; scheduler re-schedules next run | none |

## SubscriptionLifecycleService
| Failure Point | Retry Policy | Rollback Strategy | Compensation | Manual Intervention |
|---------------|-------------|-------------------|--------------|---------------------|
| Transition RPC fails (UPDATE+event) | none (atomic RPC) | DB rolls back both | re-invoke transition (idempotent) | If stuck state → super-admin manual transition |
| Invalid transition requested | n/a (rejected before write) | n/a | caller corrects target state | none |
| Access-gate derivation mismatch | n/a | recompute from `lifecycle_state` | reconciliation job | Investigate if persistent |

## BillingService
| Failure Point | Retry Policy | Rollback Strategy | Compensation | Manual Intervention |
|---------------|-------------|-------------------|--------------|---------------------|
| Invoice creation fails | none | DB tx rollback | retry create | none |
| Payment provider unreachable | 24h→72h→168h (config) | n/a (no charge) | mark `PaymentFailed`; notify owner | after final retry → manual review |
| Webhook verification fails | provider re-sends | ignore unverified | log + alert | investigate signature |
| Duplicate webhook | dedupe by txnRef | n/a | no-op | none |

## ReminderService
| Failure Point | Retry Policy | Rollback Strategy | Compensation | Manual Intervention |
|---------------|-------------|-------------------|--------------|---------------------|
| Schedule write fails | scheduler re-runs next cycle | none | idempotent (dedupe by subscription+kind) | none |
| Channel delivery fails | per-reminder `max_retries` / `retry_interval_minutes` | none | mark `retrying`; log error | after max_retries → escalate |

## SchedulerService
| Failure Point | Retry Policy | Rollback Strategy | Compensation | Manual Intervention |
|---------------|-------------|-------------------|--------------|---------------------|
| Duplicate cron fire | idempotency: `startRun` returns null | n/a | skip (already ran) | none |
| Per-item transition fails | collect error, continue batch | per-item atomic (RPC) | item retried next run | if item fails repeatedly → manual |
| Whole run crashes mid-way | next run re-processes remaining (guards make it safe) | none | `finishRun` marks failed | inspect `scheduler_runs.errors` |

## Global principles
- **Idempotency over rollback** for internal transitions (safe re-apply).
- **Atomic RPC** owns multi-write rollback (provision, transition, invoice+payment).
- **External calls** (payment provider, channels) live outside DB transactions;
  reconciled via retries + status flags, never by DB rollback.
- Every unrecoverable path ends in a **manual-review** surface (super-admin).
