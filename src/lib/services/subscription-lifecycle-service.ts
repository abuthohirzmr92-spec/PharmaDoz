import { subscriptionRepo as defaultSubscriptionRepo, settingsRepo as defaultSettingsRepo } from "@/lib/repository-instances";
import type { SubscriptionRepository } from "@/lib/repositories/subscription";
import type { SettingsRepository } from "@/lib/repositories/subscription-settings";
import { reminderService as defaultReminderService, ReminderService } from "./reminder-service";

// ---------------------------------------------------------------------------
// SubscriptionLifecycleService — the FSM engine (Phase 3C)
// ---------------------------------------------------------------------------
// Sole owner of lifecycle_state / status / tenants.status. Every mutation goes
// through SubscriptionRepository.transition() → single-writer RPC (FSM-enforced,
// atomic, idempotent, observable). Timing is config-driven. Dependencies are
// constructor-injected (default = anon singletons) so a privileged graph can be
// built by the client factory without changing this class.
// ---------------------------------------------------------------------------

/** Pure: default event_type for a target lifecycle state. */
export function eventTypeForState(state: string): string {
  switch (state) {
    case "trial_active": return "trial_activated";
    case "trial_expired": return "trial_ended";
    case "converted": return "trial_converted";
    case "active": return "subscription_created";
    case "expired": return "expired";
    case "grace_period": return "grace_started";
    case "read_only": return "read_only_started";
    case "suspended": return "suspended";
    case "archived": return "archived";
    case "terminated": return "terminated";
    case "rejected": return "trial_rejected";
    default: return "subscription_updated";
  }
}

export interface LifecycleContext {
  correlationId: string;
  actorId?: string | null;
  trigger?: "manual" | "automatic" | "webhook" | "scheduler" | "system" | "approval" | "reject";
  reason?: string;
  eventType?: string;
  previousPackageId?: string | null;
  newPackageId?: string | null;
  periodEndISO?: string;
}

export class SubscriptionLifecycleService {
  constructor(
    private subs: SubscriptionRepository = defaultSubscriptionRepo,
    private settings: SettingsRepository = defaultSettingsRepo,
    private reminders: ReminderService = defaultReminderService,
  ) {}

  private async computeTiming(toState: string): Promise<{ graceUntil?: string; readOnlyAt?: string }> {
    const now = Date.now();
    if (toState === "grace_period") {
      const days = await this.settings.getNumber("grace.period_days", "days", 7);
      return { graceUntil: new Date(now + days * 86_400_000).toISOString() };
    }
    if (toState === "read_only") {
      return { readOnlyAt: new Date(now).toISOString() };
    }
    return {};
  }

  /** Generic transition (FSM-enforced by the RPC). */
  async move(subscriptionId: string, tenantId: string, toState: string, ctx: LifecycleContext): Promise<void> {
    const timing = await this.computeTiming(toState);
    await this.subs.transition(subscriptionId, tenantId, toState, {
      correlationId: ctx.correlationId,
      actorId: ctx.actorId ?? null,
      eventType: ctx.eventType ?? eventTypeForState(toState),
      trigger: ctx.trigger ?? "system",
      reason: ctx.reason,
      previousPackageId: ctx.previousPackageId ?? null,
      newPackageId: ctx.newPackageId ?? null,
      graceUntil: timing.graceUntil ?? null,
      readOnlyAt: timing.readOnlyAt ?? null,
    });

    if ((toState === "trial_active" || toState === "active") && ctx.periodEndISO) {
      await this.reminders.scheduleForSubscription({ tenantId, subscriptionId, periodEndISO: ctx.periodEndISO });
    }
  }

  activateTrial(id: string, tenantId: string, ctx: LifecycleContext) { return this.move(id, tenantId, "trial_active", ctx); }
  convert(id: string, tenantId: string, ctx: LifecycleContext) { return this.move(id, tenantId, "converted", ctx); }
  activatePaid(id: string, tenantId: string, ctx: LifecycleContext) { return this.move(id, tenantId, "active", ctx); }
  expire(id: string, tenantId: string, ctx: LifecycleContext) { return this.move(id, tenantId, "expired", ctx); }
  enterGrace(id: string, tenantId: string, ctx: LifecycleContext) { return this.move(id, tenantId, "grace_period", ctx); }
  enterReadOnly(id: string, tenantId: string, ctx: LifecycleContext) { return this.move(id, tenantId, "read_only", ctx); }
  suspend(id: string, tenantId: string, ctx: LifecycleContext) { return this.move(id, tenantId, "suspended", ctx); }
  archive(id: string, tenantId: string, ctx: LifecycleContext) { return this.move(id, tenantId, "archived", ctx); }
  reactivate(id: string, tenantId: string, ctx: LifecycleContext) { return this.move(id, tenantId, "active", { ...ctx, eventType: ctx.eventType ?? "reactivated" }); }
  cancel(id: string, tenantId: string, ctx: LifecycleContext) { return this.move(id, tenantId, "terminated", { ...ctx, eventType: ctx.eventType ?? "canceled" }); }
}

export const subscriptionLifecycleService = new SubscriptionLifecycleService();
