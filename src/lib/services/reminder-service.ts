import { reminderRepo as defaultReminderRepo, settingsRepo as defaultSettingsRepo } from "@/lib/repository-instances";
import type { ReminderRepository } from "@/lib/repositories/reminder";
import type { SettingsRepository } from "@/lib/repositories/subscription-settings";
import { computeReminderSchedule } from "@/lib/subscription/reminder-schedule";

// ---------------------------------------------------------------------------
// ReminderService — schedule + dispatch reminders (Phase 3, channel-agnostic)
// ---------------------------------------------------------------------------
// Orchestrates ReminderRepository + SettingsRepository. Dependencies are
// constructor-injected (default = anon singletons) so a privileged (service-
// role) graph can be built by the client factory without changing this class.
// Channel delivery is delegated to NotificationService (Phase 8); here dispatch
// records a notification_log entry and marks the reminder sent.
// ---------------------------------------------------------------------------

const DEFAULT_DAYS_BEFORE = [7, 3, 0];
const DEFAULT_CHANNELS = ["email"];

export class ReminderService {
  constructor(
    private reminders: ReminderRepository = defaultReminderRepo,
    private settings: SettingsRepository = defaultSettingsRepo,
  ) {}

  async scheduleForSubscription(input: {
    tenantId: string;
    subscriptionId: string;
    periodEndISO: string;
  }): Promise<void> {
    const scheduleObj = await this.settings.getObject("reminder.schedule");
    const rawDays = scheduleObj?.days_before;
    const daysBefore = Array.isArray(rawDays)
      ? rawDays.filter((n): n is number => typeof n === "number")
      : DEFAULT_DAYS_BEFORE;

    const channelsObj = await this.settings.getObject("reminder.channels");
    const rawChannels = channelsObj?.channels;
    const channels = Array.isArray(rawChannels)
      ? rawChannels.filter((c): c is string => typeof c === "string")
      : DEFAULT_CHANNELS;

    const schedule = computeReminderSchedule(input.periodEndISO, daysBefore);
    for (const s of schedule) {
      await this.reminders.schedule({
        tenantId: input.tenantId,
        subscriptionId: input.subscriptionId,
        kind: s.kind,
        scheduledFor: s.scheduledFor,
        channels,
      });
    }
  }

  /** Dispatch all due reminders. Returns the number processed. */
  async dispatchDue(nowISO: string): Promise<number> {
    const due = await this.reminders.listDue(nowISO);
    for (const r of due) {
      const channel = r.channels[0] ?? "email";
      await this.reminders.logNotification({
        tenantId: r.tenantId,
        reminderId: r.id,
        templateKey: r.templateKey,
        channel,
        status: "sent",
      });
      await this.reminders.markSent(r.id);
    }
    return due.length;
  }

  /** One-off payment confirmation notification (channel delivery in Phase 8). */
  async notifyPaymentReceived(tenantId: string, subscriptionId?: string | null): Promise<void> {
    await this.reminders.logNotification({
      tenantId,
      reminderId: null,
      templateKey: "payment_received",
      channel: "email",
      payload: subscriptionId ? { subscriptionId } : {},
      status: "sent",
    });
  }
}

export const reminderService = new ReminderService();
