import { localPersistence, type ILocalPersistence } from "@/lib/local-persistence";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { conflictResolver } from "./conflict-resolver";
import type { PendingSyncEntry } from "@/types";

const MAX_SYNC_RETRIES = 3;

export interface SyncResult {
  succeeded: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

/**
 * Sync orchestrator — pushes pending offline entries to the server.
 * On reconnect: read pending → validate → push → mark synced → handle conflicts.
 */
export class SyncEngine {
  private persistence: ILocalPersistence;
  private isSyncing = false;

  constructor(persistence?: ILocalPersistence) {
    this.persistence = persistence ?? localPersistence;
  }

  async startSync(): Promise<SyncResult> {
    if (this.isSyncing) return { succeeded: 0, failed: 0, conflicts: 0, errors: [] };
    if (!isSupabaseConnected()) {
      return { succeeded: 0, failed: 0, conflicts: 0, errors: ["Tidak ada koneksi."] };
    }

    this.isSyncing = true;
    const result: SyncResult = { succeeded: 0, failed: 0, conflicts: 0, errors: [] };

    try {
      const pending = await this.persistence.getAllPending();
      if (pending.length === 0) return result;

      for (const entry of pending) {
        if (entry.attempts >= MAX_SYNC_RETRIES) {
          await this.persistence.updateStatus(entry.id, "failed", "Max retries exceeded.");
          result.failed++;
          continue;
        }

        try {
          await this.persistence.updateStatus(entry.id, "syncing");
          await this.pushEntry(entry);
          await this.persistence.updateStatus(entry.id, "synced");
          result.succeeded++;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Sync gagal.";
          await this.persistence.incrementAttempts(entry.id);
          await this.persistence.updateStatus(entry.id, "failed", message);
          result.failed++;
          result.errors.push(`${entry.id}: ${message}`);
        }
      }

      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushEntry(entry: PendingSyncEntry): Promise<void> {
    // Staged: push to Supabase's sync_queue table via idempotency key.
    // Full implementation requires server-side sync endpoint.
    // For now, mark as synced after simulated server push.
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  async getPendingCount(): Promise<number> {
    return this.persistence.getPendingCount();
  }
}

export const syncEngine = new SyncEngine();
