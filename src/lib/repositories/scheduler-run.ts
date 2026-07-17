import { BaseRepository } from "./base";

// ---------------------------------------------------------------------------
// SchedulerRunRepository — cron run log + idempotency (migration 065)
// ---------------------------------------------------------------------------
// Persistence only. UNIQUE(job_key, run_date) enforces at-least-once
// idempotency: startRun returns null if the job already ran that day.
// ---------------------------------------------------------------------------

export interface SchedulerRunRecord {
  id: string;
  jobKey: string;
  runDate: string;
  status: string;
  processedCount: number;
}

/** Pure: is a run in a terminal state? */
export function isTerminalRunStatus(status: string): boolean {
  return status === "completed" || status === "failed";
}

export class SchedulerRunRepository extends BaseRepository {
  /**
   * Acquire a run slot for (jobKey, runDate). Returns the new run id, or null
   * if a run already exists for that day (idempotency guard via UNIQUE).
   */
  async startRun(jobKey: string, runDate: string): Promise<string | null> {
    if (!this.isConnected) return null;
    const { data, error } = await this.client
      .from("scheduler_runs")
      .insert({ job_key: jobKey, run_date: runDate, status: "running" })
      .select("id")
      .maybeSingle();
    if (error) {
      // 23505 = unique_violation → already ran this day; not an error.
      if ((error as { code?: string }).code === "23505") return null;
      return this.handleError(error, "SchedulerRunRepository.startRun");
    }
    return (data as { id: string } | null)?.id ?? null;
  }

  async finishRun(
    id: string,
    result: { status: "completed" | "failed"; processedCount?: number; errors?: unknown[] },
  ): Promise<void> {
    if (!this.isConnected) return;
    const { error } = await this.client
      .from("scheduler_runs")
      .update({
        status: result.status,
        processed_count: result.processedCount ?? 0,
        errors: result.errors ?? [],
        finished_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return this.handleError(error, "SchedulerRunRepository.finishRun");
  }
}
