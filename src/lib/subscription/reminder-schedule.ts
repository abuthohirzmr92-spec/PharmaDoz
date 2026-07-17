// ---------------------------------------------------------------------------
// Reminder schedule computation (pure)
// ---------------------------------------------------------------------------
// Given a subscription period end and the configured "days before expiry"
// schedule (from subscription_settings.reminder.schedule), compute the concrete
// reminder timestamps. Pure — no I/O.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

export interface ScheduledReminder {
  kind: string;
  scheduledFor: string; // ISO
}

/**
 * Pure: build reminder entries for `daysBefore` the period end.
 * daysBefore = [7,3,0] → kinds expiry_7d / expiry_3d / expiry_0d.
 */
export function computeReminderSchedule(periodEndISO: string, daysBefore: number[]): ScheduledReminder[] {
  const end = Date.parse(periodEndISO);
  if (Number.isNaN(end)) return [];
  return daysBefore.map((d) => ({
    kind: `expiry_${d}d`,
    scheduledFor: new Date(end - d * DAY_MS).toISOString(),
  }));
}
