import Dexie, { type Table } from "dexie";
import type { ILocalPersistence } from "@/lib/local-persistence";
import type { PendingSyncEntry, SyncEntryStatus } from "@/types";
import { getBusinessDayKey } from "@/lib/business-day";

interface StoredEntry {
  id: string;
  businessDay: string;
  type: "transaction" | "movement" | "opname" | "purchase";
  payload: unknown;
  createdAt: string;
  syncStatus: SyncEntryStatus;
  attempts: number;
  lastError: string | null;
}

interface StoredSnapshot {
  businessDay: string;
  data: unknown;
  savedAt: string;
}

class ApotekDB extends Dexie {
  syncQueue!: Table<StoredEntry, string>;
  snapshots!: Table<StoredSnapshot, string>;

  constructor() {
    super("ApotekOfflineDB");
    this.version(1).stores({
      syncQueue: "id, businessDay, syncStatus, createdAt",
      snapshots: "businessDay",
    });
  }
}

export class IndexedDBPersistence implements ILocalPersistence {
  private db: ApotekDB | null = null;

  private getDB(): ApotekDB {
    if (!this.db) {
      this.db = new ApotekDB();
    }
    return this.db;
  }

  private isAvailable(): boolean {
    return typeof window !== "undefined" && typeof indexedDB !== "undefined";
  }

  async enqueue(
    entry: Omit<
      PendingSyncEntry,
      "id" | "createdAt" | "syncStatus" | "attempts" | "lastError"
    >,
  ): Promise<PendingSyncEntry> {
    if (!this.isAvailable()) throw new Error("IndexedDB tidak tersedia.");

    const full: StoredEntry = {
      id: crypto.randomUUID(),
      businessDay: entry.businessDay ?? getBusinessDayKey(),
      type: entry.type,
      payload: entry.payload,
      createdAt: new Date().toISOString(),
      syncStatus: "pending",
      attempts: 0,
      lastError: null,
    };

    await this.getDB().syncQueue.put(full);
    return { ...full };
  }

  async dequeue(id: string): Promise<void> {
    if (!this.isAvailable()) return;
    await this.getDB().syncQueue.delete(id);
  }

  async getAllPending(): Promise<PendingSyncEntry[]> {
    if (!this.isAvailable()) return [];
    return this.getDB().syncQueue
      .where("syncStatus")
      .anyOf("pending", "failed")
      .toArray() as Promise<PendingSyncEntry[]>;
  }

  async getByBusinessDay(businessDay: string): Promise<PendingSyncEntry[]> {
    if (!this.isAvailable()) return [];
    return this.getDB().syncQueue
      .where("businessDay")
      .equals(businessDay)
      .toArray() as Promise<PendingSyncEntry[]>;
  }

  async getPendingCount(): Promise<number> {
    if (!this.isAvailable()) return 0;
    return this.getDB().syncQueue
      .where("syncStatus")
      .anyOf("pending", "failed")
      .count();
  }

  async updateStatus(
    id: string,
    status: SyncEntryStatus,
    error?: string,
  ): Promise<void> {
    if (!this.isAvailable()) return;
    await this.getDB().syncQueue.update(id, {
      syncStatus: status,
      ...(error ? { lastError: error } : {}),
    });
  }

  async incrementAttempts(id: string): Promise<void> {
    if (!this.isAvailable()) return;
    const entry = await this.getDB().syncQueue.get(id);
    if (entry) {
      await this.getDB().syncQueue.update(id, {
        attempts: entry.attempts + 1,
      });
    }
  }

  async saveSnapshot(businessDay: string, data: unknown): Promise<void> {
    if (!this.isAvailable()) return;
    await this.getDB().snapshots.put({
      businessDay,
      data,
      savedAt: new Date().toISOString(),
    });
  }

  async getSnapshot(businessDay: string): Promise<unknown | null> {
    if (!this.isAvailable()) return null;
    const snap = await this.getDB().snapshots.get(businessDay);
    return snap?.data ?? null;
  }

  async removeSnapshot(businessDay: string): Promise<void> {
    if (!this.isAvailable()) return;
    await this.getDB().snapshots.delete(businessDay);
  }

  async clearAll(): Promise<void> {
    if (!this.isAvailable()) return;
    await this.getDB().syncQueue.clear();
    await this.getDB().snapshots.clear();
  }

  async clearBusinessDay(businessDay: string): Promise<void> {
    if (!this.isAvailable()) return;
    await this.getDB().syncQueue.where("businessDay").equals(businessDay).delete();
    await this.getDB().snapshots.delete(businessDay);
  }

  async getFailedEntries(): Promise<PendingSyncEntry[]> {
    if (!this.isAvailable()) return [];
    return this.getDB().syncQueue
      .where("syncStatus")
      .equals("failed")
      .toArray() as Promise<PendingSyncEntry[]>;
  }

  async clearAllForTenant(_tenantId: string): Promise<void> {
    return this.clearAll();
  }
}
