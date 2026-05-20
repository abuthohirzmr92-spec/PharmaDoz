// ---------------------------------------------------------------------------
// Pluggable local persistence abstraction (localStorage implementation)
//
// Design intent: consumers depend on ILocalPersistence, never on the concrete
// class.  A future swap to Dexie/IndexedDB can be made in *this file only*
// without touching any consumer code.
// ---------------------------------------------------------------------------

import type {
  PendingSyncEntry,
  SyncEntryStatus,
} from "@/types";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface ILocalPersistence {
  // ---- Queue operations ------------------------------------------------
  enqueue(
    entry: Omit<
      PendingSyncEntry,
      "id" | "createdAt" | "syncStatus" | "attempts" | "lastError"
    >,
  ): Promise<PendingSyncEntry>;

  dequeue(id: string): Promise<void>;
  getAllPending(): Promise<PendingSyncEntry[]>;
  getByBusinessDay(businessDay: string): Promise<PendingSyncEntry[]>;
  getPendingCount(): Promise<number>;

  updateStatus(id: string, status: SyncEntryStatus, error?: string): Promise<void>;
  incrementAttempts(id: string): Promise<void>;

  // ---- Snapshot operations (daily bucket) ------------------------------
  saveSnapshot(businessDay: string, data: unknown): Promise<void>;
  getSnapshot(businessDay: string): Promise<unknown | null>;
  removeSnapshot(businessDay: string): Promise<void>;

  // ---- Lifecycle -------------------------------------------------------
  clearAll(): Promise<void>;
  clearBusinessDay(businessDay: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// localStorage implementation
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = "apotek_persist_";
const QUEUE_KEY = `${STORAGE_PREFIX}queue`;
const SNAPSHOT_PREFIX = `${STORAGE_PREFIX}snapshot_`;

export class LocalStoragePersistence implements ILocalPersistence {
  private isServer(): boolean {
    return typeof window === "undefined";
  }

  /** Return the full queue array from localStorage (empty array if none). */
  private readQueue(): PendingSyncEntry[] {
    if (this.isServer()) return [];
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? (JSON.parse(raw) as PendingSyncEntry[]) : [];
    } catch {
      return [];
    }
  }

  /** Persist the queue array to localStorage. */
  private writeQueue(queue: PendingSyncEntry[]): void {
    if (this.isServer()) return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  // -----------------------------------------------------------------------
  // Queue operations
  // -----------------------------------------------------------------------

  async enqueue(
    entry: Omit<
      PendingSyncEntry,
      "id" | "createdAt" | "syncStatus" | "attempts" | "lastError"
    >,
  ): Promise<PendingSyncEntry> {
    const fullEntry: PendingSyncEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      syncStatus: "pending",
      attempts: 0,
      lastError: null,
    };

    const queue = this.readQueue();
    queue.push(fullEntry);
    this.writeQueue(queue);

    return fullEntry;
  }

  async dequeue(id: string): Promise<void> {
    const queue = this.readQueue();
    const filtered = queue.filter((e) => e.id !== id);
    if (filtered.length < queue.length) {
      this.writeQueue(filtered);
    }
  }

  async getAllPending(): Promise<PendingSyncEntry[]> {
    return this.readQueue();
  }

  async getByBusinessDay(businessDay: string): Promise<PendingSyncEntry[]> {
    const queue = this.readQueue();
    return queue.filter((e) => e.businessDay === businessDay);
  }

  async getPendingCount(): Promise<number> {
    return this.readQueue().length;
  }

  async updateStatus(
    id: string,
    status: SyncEntryStatus,
    error?: string,
  ): Promise<void> {
    const queue = this.readQueue();
    const entry = queue.find((e) => e.id === id);
    if (!entry) return;

    entry.syncStatus = status;
    if (status === "failed") {
      entry.lastError = error ?? null;
    }
    this.writeQueue(queue);
  }

  async incrementAttempts(id: string): Promise<void> {
    const queue = this.readQueue();
    const entry = queue.find((e) => e.id === id);
    if (!entry) return;

    entry.attempts += 1;
    this.writeQueue(queue);
  }

  // -----------------------------------------------------------------------
  // Snapshot operations
  // -----------------------------------------------------------------------

  async saveSnapshot(businessDay: string, data: unknown): Promise<void> {
    if (this.isServer()) return;
    const key = `${SNAPSHOT_PREFIX}${businessDay}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  async getSnapshot(businessDay: string): Promise<unknown | null> {
    if (this.isServer()) return null;
    const key = `${SNAPSHOT_PREFIX}${businessDay}`;
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  async removeSnapshot(businessDay: string): Promise<void> {
    if (this.isServer()) return;
    const key = `${SNAPSHOT_PREFIX}${businessDay}`;
    localStorage.removeItem(key);
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  async clearAll(): Promise<void> {
    if (this.isServer()) return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  async clearBusinessDay(businessDay: string): Promise<void> {
    // Remove snapshot for this business day.
    await this.removeSnapshot(businessDay);

    // Remove all queue entries for this business day.
    const queue = this.readQueue();
    const filtered = queue.filter((e) => e.businessDay !== businessDay);
    if (filtered.length < queue.length) {
      this.writeQueue(filtered);
    }
  }
}

// ---------------------------------------------------------------------------
// Auto-switch factory
// ---------------------------------------------------------------------------

let _persistence: ILocalPersistence | null = null;

export function createPersistence(): ILocalPersistence {
  if (_persistence) return _persistence as ILocalPersistence;

  // Prefer IndexedDB (Dexie) when available, fall back to localStorage
  if (
    typeof window !== "undefined" &&
    typeof indexedDB !== "undefined"
  ) {
    try {
      // Lazy-import IndexedDB implementation to avoid bundling in SSR
      const { IndexedDBPersistence } = require("./offline/indexeddb-persistence");
      _persistence = new IndexedDBPersistence();
      return _persistence!;
    } catch {
      // Fall through to localStorage
    }
  }

  _persistence = new LocalStoragePersistence();
  return _persistence!;
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const localPersistence: ILocalPersistence = createPersistence();
