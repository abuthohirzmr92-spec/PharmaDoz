"use client";

import { create } from "zustand";
import type { BackupMetadata, BackupType } from "@/types";
import {
  createBackupMetadata,
  completeBackup,
  failBackup,
  pruneBackups,
  generateDemoBackups,
  getRpoEstimate,
  shouldTriggerBackup,
} from "@/lib/backup/backup-manager";

interface BackupState {
  backups: BackupMetadata[];
  isLoading: boolean;
  /** Start a new backup (creates metadata in pending state) */
  startBackup(type: BackupType, pharmacyId?: string | null): string;
  /** Mark a backup as completed */
  finishBackup(id: string, size: number, checksum: string): void;
  /** Mark a backup as failed */
  failBackup(id: string, error: string): void;
  /** Remove old backups beyond checkpoint count */
  prune(): void;
  /** Get recovery point objective in hours */
  getRpo(): number | null;
  /** Check if backup is needed */
  isBackupNeeded(maxAgeHours?: number): boolean;
  /** Reload demo data */
  seedDemo(): void;
  /** Get completed backups sorted by date desc */
  getCompleted(): BackupMetadata[];
  /** Get failed backups */
  getFailed(): BackupMetadata[];
  /** Get latest successful backup */
  getLatest(): BackupMetadata | null;
}

export const useBackupStore = create<BackupState>((set, get) => ({
  backups: generateDemoBackups(),
  isLoading: false,

  startBackup(type, pharmacyId) {
    const meta = createBackupMetadata({ type, pharmacyId });
    set((s) => ({ backups: [meta, ...s.backups] }));
    return meta.id;
  },

  finishBackup(id, size, checksum) {
    set((s) => ({
      backups: s.backups.map((b) =>
        b.id === id ? completeBackup(b, size, checksum) : b
      ),
    }));
  },

  failBackup(id, error) {
    set((s) => ({
      backups: s.backups.map((b) => (b.id === id ? failBackup(b, error) : b)),
    }));
  },

  prune() {
    set((s) => ({ backups: pruneBackups(s.backups) }));
  },

  getRpo() {
    return getRpoEstimate(get().backups);
  },

  isBackupNeeded(maxAgeHours) {
    const latest = get().getLatest();
    return shouldTriggerBackup(latest?.completedAt ?? null, maxAgeHours);
  },

  seedDemo() {
    set({ backups: generateDemoBackups(), isLoading: false });
  },

  getCompleted() {
    return get().backups
      .filter((b) => b.status === "completed")
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
  },

  getFailed() {
    return get().backups.filter((b) => b.status === "failed");
  },

  getLatest() {
    const completed = get().getCompleted();
    return completed[0] ?? null;
  },
}));
