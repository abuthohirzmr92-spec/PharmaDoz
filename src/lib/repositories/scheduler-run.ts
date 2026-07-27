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
  startedAt?: string | null;
  finishedAt?: string | null;
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

  /** List recent runs — optionally filtered by job_key. */
  async listRecent(jobKey?: string, limit = 10): Promise<SchedulerRunRecord[]> {
    if (!this.isConnected) return [];
    let q = this.client
      .from("scheduler_runs")
      .select("id, job_key, run_date, status, processed_count, started_at, finished_at")
      .order("run_date", { ascending: false })
      .limit(limit);
    if (jobKey) q = q.eq("job_key", jobKey);
    const { data, error } = await q;
    if (error) return this.handleError(error, "SchedulerRunRepository.listRecent");
    return ((data ?? []) as any[]).map((r: any) => ({
      id: r.id,
      jobKey: r.job_key,
      runDate: r.run_date,
      status: r.status,
      processedCount: r.processed_count ?? 0,
      startedAt: r.started_at ?? null,
      finishedAt: r.finished_at ?? null,
    })) as SchedulerRunRecord[];
  }

  /** List distinct job keys that have at least one run recorded. */
  async listJobKeys(): Promise<string[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("scheduler_runs")
      .select("job_key")
      .order("job_key");
    if (error) return this.handleError(error, "SchedulerRunRepository.listJobKeys");
    const keys = new Set<string>();
    for (const row of (data ?? []) as { job_key: string }[]) {
      if (row.job_key) keys.add(row.job_key);
    }
    return [...keys];
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
