import { BaseRepository, mapRows } from "./base";

// ---------------------------------------------------------------------------
// ReminderRepository — channel-agnostic reminders + notification log
// ---------------------------------------------------------------------------
// Persistence only (migrations 063/064). Dispatch across channels is a
// ReminderService/NotificationService concern (Phase 8) — not here.
// ---------------------------------------------------------------------------

export interface ReminderRecord {
  id: string;
  subscriptionId: string | null;
  tenantId: string;
  kind: string;
  priority: string;
  channels: string[];
  templateKey: string | null;
  language: string;
  scheduledFor: string;
  sentAt: string | null;
  status: string;
  retryCount: number;
  maxRetries: number;
}

interface DueRow {
  scheduled_for: string;
  status: string;
}

/** Pure: is a reminder due for dispatch at `nowISO`? */
export function isReminderDue(r: DueRow, nowISO: string): boolean {
  if (r.status !== "pending" && r.status !== "retrying") return false;
  return Date.parse(r.scheduled_for) <= Date.parse(nowISO);
}

export interface ScheduleReminderInput {
  tenantId: string;
  subscriptionId?: string | null;
  kind: string;
  scheduledFor: string;
  priority?: string;
  channels?: string[];
  templateKey?: string | null;
  language?: string;
}

const COLS =
  "id, subscription_id, tenant_id, kind, priority, channels, template_key, " +
  "language, scheduled_for, sent_at, status, retry_count, max_retries";

export class ReminderRepository extends BaseRepository {
  async listDue(nowISO: string, limit = 200): Promise<ReminderRecord[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("reminders")
      .select(COLS)
      .in("status", ["pending", "retrying"])
      .lte("scheduled_for", nowISO)
      .order("scheduled_for", { ascending: true })
      .limit(limit);
    if (error) return this.handleError(error, "ReminderRepository.listDue");
    return mapRows<ReminderRecord>((data ?? []) as Record<string, unknown>[]);
  }

  async schedule(input: ScheduleReminderInput): Promise<void> {
    if (!this.isConnected) return;
    const { error } = await this.client.from("reminders").insert({
      tenant_id: input.tenantId,
      subscription_id: input.subscriptionId ?? null,
      kind: input.kind,
      scheduled_for: input.scheduledFor,
      priority: input.priority ?? "normal",
      channels: input.channels ?? ["email"],
      template_key: input.templateKey ?? null,
      language: input.language ?? "id",
    });
    if (error) return this.handleError(error, "ReminderRepository.schedule");
  }

  async markSent(id: string): Promise<void> {
    if (!this.isConnected) return;
    const { error } = await this.client
      .from("reminders")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return this.handleError(error, "ReminderRepository.markSent");
  }

  async logNotification(input: {
    tenantId: string;
    reminderId?: string | null;
    templateKey?: string | null;
    channel: string;
    recipient?: string | null;
    payload?: Record<string, unknown>;
    status?: string;
    errorMessage?: string | null;
  }): Promise<void> {
    if (!this.isConnected) return;
    const { error } = await this.client.from("notification_log").insert({
      tenant_id: input.tenantId,
      reminder_id: input.reminderId ?? null,
      template_key: input.templateKey ?? null,
      channel: input.channel,
      recipient: input.recipient ?? null,
      payload: input.payload ?? {},
      status: input.status ?? "sent",
      error_message: input.errorMessage ?? null,
    });
    if (error) return this.handleError(error, "ReminderRepository.logNotification");
  }
}
