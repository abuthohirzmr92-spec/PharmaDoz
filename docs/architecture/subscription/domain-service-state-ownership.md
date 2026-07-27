# Domain Service State Ownership Matrix

Exactly ONE service owns each business state (single writer). Others read via
repositories or react to events. This prevents split-brain ownership.

| Business State | Owning Service | Backing store (writer) | Readers (examples) |
|----------------|----------------|------------------------|--------------------|
| **Trial (intake)** | ProvisionTenantService (approval) / TrialRequestRepository writes | `trial_requests` | Platform queue UI |
| **Subscription Lifecycle** (`lifecycle_state`) | **SubscriptionLifecycleService** (sole mutator) | `subscriptions.lifecycle_state` + `subscription_events` | Owner portal, Scheduler, Analytics |
| **Subscription commercial status** (`status`) | SubscriptionLifecycleService (derives/keeps in sync) | `subscriptions.status` | Billing, FeatureResolver |
| **Package Assignment** (`package_id`) | SubscriptionLifecycleService (upgrade/downgrade) | `subscriptions.package_id`, `tenants.package_id` | FeatureResolver, Quota |
| **Quota Usage** (`current_value`, `max_override`) | QuotaService (Phase 4 collector) / provisioning seeds | `tenant_quota_usage` | Quota validation, Owner usage |
| **Reminder Schedule** | **ReminderService** | `reminders` | Scheduler dispatch, Owner |
| **Billing** (proration, charge intent) | **BillingService** | (in-memory calc) → `invoices` | Owner portal |
| **Invoice** (`status`, `paid_at`) | BillingService | `invoices` | Owner portal, Analytics |
| **Notification** (delivery record) | ReminderService / NotificationService | `notification_log` | Owner in-app center |
| **Scheduler** (run record) | **SchedulerService** | `scheduler_runs` | Platform scheduler UI |
| **Tenant access-gate** (`tenants.status`) | SubscriptionLifecycleService (via `deriveAccessGate`) | `tenants.status` | Middleware/login |
| **Capability Snapshot** (Phase 3+) | FeatureResolver / CapabilityService | in-memory cache | UI gates, API authz |

## Rules
- **Single writer** per state. If another service needs to change a state, it
  calls the owning service — never writes the store directly.
- `lifecycle_state`, `status`, `package_id`, and `tenants.status` are all owned
  by **SubscriptionLifecycleService** because they must move together (via the
  transition RPC).
- Quota usage counters are owned by the QuotaService/collector (Phase 4);
  provisioning seeds initial values through the provision RPC only.
- Reminders vs Notifications: ReminderService owns *scheduling*;
  NotificationService (Phase 8) owns *delivery* records — both write
  `notification_log` but only via ReminderService orchestration.
