"use client";

import type { BackupMetadata, BackupType, BackupStatus } from "@/types";
import { BACKUP_CHECKPOINT_COUNT } from "@/config/constants";

let backupCounter = 0;

function generateBackupId(): string {
  backupCounter++;
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 6);
  return `bkp-${ts}-${rnd}-${backupCounter}`;
}

export interface CreateBackupParams {
  type: BackupType;
  pharmacyId?: string | null;
}

export function createBackupMetadata(params: CreateBackupParams): BackupMetadata {
  return {
    id: generateBackupId(),
    type: params.type,
    status: "pending",
    pharmacyId: params.pharmacyId ?? null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    size: null,
    checksum: null,
    error: null,
  };
}

export function completeBackup(backup: BackupMetadata, size: number, checksum: string): BackupMetadata {
  return {
    ...backup,
    status: "completed",
    completedAt: new Date().toISOString(),
    size,
    checksum,
  };
}

export function failBackup(backup: BackupMetadata, error: string): BackupMetadata {
  return {
    ...backup,
    status: "failed",
    completedAt: new Date().toISOString(),
    error,
  };
}

/** Prune old backups keeping only the last N checkpoints */
export function pruneBackups(backups: BackupMetadata[], maxCheckpoints?: number): BackupMetadata[] {
  const limit = maxCheckpoints ?? BACKUP_CHECKPOINT_COUNT;
  const completed = backups
    .filter((b) => b.status === "completed")
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const keepIds = new Set(completed.slice(0, limit).map((b) => b.id));
  return backups.filter((b) => b.status !== "completed" || keepIds.has(b.id));
}

export function generateDemoBackups(): BackupMetadata[] {
  const now = Date.now();
  const result: BackupMetadata[] = [];
  for (let i = 0; i < 8; i++) {
    const types: BackupType[] = ["full", "incremental", "snapshot"];
    const statuses: BackupStatus[] = ["completed", "completed", "completed", "completed", "completed", "failed", "completed", "completed"];
    const startedAt = new Date(now - i * 12 * 3600000).toISOString();
    const completedAt = new Date(now - i * 12 * 3600000 + 60000).toISOString();
    const status = statuses[i]!;
    result.push({
      id: `bkp-demo-${i}`,
      type: types[i % 3]!,
      status,
      pharmacyId: i % 3 === 0 ? null : `pharm-00${(i % 3) + 1}`,
      startedAt,
      completedAt: status === "completed" || status === "failed" ? completedAt : null,
      size: status === "completed" ? Math.round(Math.random() * 50_000_000 + 1_000_000) : null,
      checksum: status === "completed" ? `sha256-${Math.random().toString(16).substring(2, 34)}` : null,
      error: status === "failed" ? "Koneksi jaringan terputus saat backup" : null,
    });
  }
  return result;
}

/** Check if backup should be triggered (e.g., before maintenance) */
export function shouldTriggerBackup(lastBackupAt: string | null, maxAgeHours?: number): boolean {
  if (!lastBackupAt) return true;
  const maxMs = (maxAgeHours ?? 24) * 3600000;
  return Date.now() - new Date(lastBackupAt).getTime() > maxMs;
}

/** Validate a completed backup has required fields */
export function validateBackup(backup: BackupMetadata): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (backup.status === "completed" && !backup.checksum) errors.push("Backup selesai tanpa checksum");
  if (backup.status === "completed" && !backup.size) errors.push("Backup selesai tanpa ukuran");
  if (!backup.id) errors.push("Backup tanpa ID");
  return { valid: errors.length === 0, errors };
}

/** Get recovery point objective estimate (hours since last successful backup) */
export function getRpoEstimate(backups: BackupMetadata[]): number | null {
  const lastSuccess = backups
    .filter((b) => b.status === "completed")
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
  if (!lastSuccess?.completedAt) return null;
  return (Date.now() - new Date(lastSuccess.completedAt).getTime()) / 3600000;
}
