import { schedulerRunRepo as defaultRunRepo, subscriptionRepo as defaultSubRepo, settingsRepo as defaultSettingsRepo } from "@/lib/repository-instances";
import type { SchedulerRunRepository } from "@/lib/repositories/scheduler-run";
import type { SubscriptionRepository } from "@/lib/repositories/subscription";
import type { SettingsRepository } from "@/lib/repositories/subscription-settings";
import { subscriptionLifecycleService as defaultLifecycle, SubscriptionLifecycleService } from "./subscription-lifecycle-service";
import { reminderService as defaultReminder, ReminderService } from "./reminder-service";
import { decideSweepTransition } from "@/lib/subscription/sweep";

// ---------------------------------------------------------------------------
// SchedulerService — cron entrypoints (Phase 3C)
// ---------------------------------------------------------------------------
// Idempotent per (job, run_date) via SchedulerRunRepository. Orchestrates the
// lifecycle sweep and reminder dispatch. Dependencies are constructor-injected
// (default = anon singletons); a privileged (service-role) graph is built via
// createPrivilegedScheduler() for cron execution. No scheduler logic redesign.
// ---------------------------------------------------------------------------

export class SchedulerService {
  constructor(
    private runs: SchedulerRunRepository = defaultRunRepo,
    private subs: SubscriptionRepository = defaultSubRepo,
    private settings: SettingsRepository = defaultSettingsRepo,
    private lifecycle: SubscriptionLifecycleService = defaultLifecycle,
    private reminders: ReminderService = defaultReminder,
  ) {}

  /** expired → grace → read_only → suspended, one step per subscription per run. */
  async runSubscriptionSweep(runDate: string, nowISO: string): Promise<{ processed: number; skipped: boolean }> {
    const runId = await this.runs.startRun("subscription_sweep", runDate);
    if (!runId) return { processed: 0, skipped: true };

    const readOnlyDays = await this.settings.getNumber("grace.read_only_days", "days", 14);
    const candidates = await this.subs.listForSweep();

    let processed = 0;
    const errors: unknown[] = [];
    for (const c of candidates) {
      const decision = decideSweepTransition(
        {
          lifecycleState: c.lifecycleState,
          currentPeriodEnd: c.currentPeriodEnd,
          graceUntil: c.graceUntil,
          readOnlyAt: c.readOnlyAt,
        },
        nowISO,
        { readOnlyDays },
      );
      if (!decision) continue;
      try {
        await this.lifecycle.move(c.id, c.tenantId, decision.toState, {
          correlationId: `${runId}:${c.id}:${decision.toState}`,
          trigger: "scheduler",
          eventType: decision.eventType,
          reason: "subscription_sweep",
        });
        processed++;
      } catch (e) {
        errors.push({ subscriptionId: c.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    await this.runs.finishRun(runId, { status: "completed", processedCount: processed, errors });
    return { processed, skipped: false };
  }

  /** Dispatch all due reminders. */
  async runReminderDispatch(runDate: string, nowISO: string): Promise<{ processed: number; skipped: boolean }> {
    const runId = await this.runs.startRun("reminder_dispatch", runDate);
    if (!runId) return { processed: 0, skipped: true };
    const processed = await this.reminders.dispatchDue(nowISO);
    await this.runs.finishRun(runId, { status: "completed", processedCount: processed });
    return { processed, skipped: false };
  }
}

export const schedulerService = new SchedulerService();
