"use client";

import { create } from "zustand";
import type { OperationalEvent, MaintenanceMode, RecoveryAction } from "@/types";
import { useEventLogStore } from "@/store/event-log-store";
import { useMetricsStore } from "@/store/metrics-store";
import { useBackupStore } from "@/store/backup-store";
import { useRecoveryStore } from "@/store/recovery-store";
import { useMaintenanceStore } from "@/store/maintenance-store";
import { isDemoMode as checkDemoMode } from "@/config/env";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AiAlert {
  id: string;
  level: "info" | "warn" | "critical";
  category: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export type SystemHealth = "healthy" | "degraded" | "down";

export interface AiStoreState {
  systemHealth: SystemHealth;
  activeAlerts: AiAlert[];
  recentEvents: OperationalEvent[];
  syncBacklog: number;
  failedTransactions24h: number;
  offlineBranches: number;
  maintenanceStatus: MaintenanceMode;
  lastBackup: string | null;
  recoveryActions: RecoveryAction[];
  summary: string;
  isLoading: boolean;
  error: string | null;
  loadDiagnostics(): void;
  acknowledgeAlert(id: string): void;
  clear(): void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildSummary(d: {
  systemHealth: SystemHealth;
  failedTransactions24h: number;
  offlineBranches: number;
  syncBacklog: number;
  maintenanceStatus: MaintenanceMode;
  lastBackup: string | null;
  recoveryActions: RecoveryAction[];
  activeAlerts: AiAlert[];
}): string {
  const parts: string[] = [];

  // Health statement
  if (d.systemHealth === "healthy") {
    parts.push("Sistem dalam kondisi sehat. Seluruh komponen berjalan normal.");
  } else if (d.systemHealth === "degraded") {
    parts.push("Sistem mengalami degradasi kinerja. Beberapa komponen memerlukan perhatian.");
  } else {
    parts.push("Sistem dalam kondisi kritis. Diperlukan tindakan segera.");
  }

  // Failed transactions
  if (d.failedTransactions24h > 0) {
    parts.push(`${d.failedTransactions24h} transaksi gagal dalam 24 jam terakhir.`);
  }

  // Offline branches
  if (d.offlineBranches > 0) {
    parts.push(`${d.offlineBranches} cabang dalam status offline.`);
  }

  // Sync backlog
  if (d.syncBacklog > 0) {
    parts.push(`Antrean sinkronisasi: ${d.syncBacklog} entri menunggu.`);
  }

  // Maintenance
  if (d.maintenanceStatus !== "none") {
    parts.push(`Mode maintenance aktif: ${d.maintenanceStatus}.`);
  }

  // Backup
  if (d.lastBackup) {
    const hoursAgo = Math.round(
      (Date.now() - new Date(d.lastBackup).getTime()) / 3600000,
    );
    if (hoursAgo < 1) {
      parts.push("Backup terakhir: kurang dari 1 jam yang lalu.");
    } else if (hoursAgo < 24) {
      parts.push(`Backup terakhir: ${hoursAgo} jam yang lalu.`);
    } else {
      const daysAgo = Math.round(hoursAgo / 24);
      parts.push(`Backup terakhir: ${daysAgo} hari yang lalu.`);
    }
  } else {
    parts.push("Belum ada backup yang tercatat.");
  }

  // Recovery
  const pendingRecovery = d.recoveryActions.filter(
    (a) => a.status === "pending" || a.status === "retrying",
  ).length;
  if (pendingRecovery > 0) {
    parts.push(`${pendingRecovery} aksi pemulihan menunggu proses.`);
  }

  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/*  Alert level ordering                                               */
/* ------------------------------------------------------------------ */

function alertLevelValue(level: AiAlert["level"]): number {
  if (level === "critical") return 0;
  if (level === "warn") return 1;
  return 2;
}

/* ------------------------------------------------------------------ */
/*  Default state                                                      */
/* ------------------------------------------------------------------ */

export const DEFAULT_DIAGNOSTICS = {
  systemHealth: "healthy" as SystemHealth,
  activeAlerts: [] as AiAlert[],
  recentEvents: [] as OperationalEvent[],
  syncBacklog: 0,
  failedTransactions24h: 0,
  offlineBranches: 0,
  maintenanceStatus: "none" as MaintenanceMode,
  lastBackup: null as string | null,
  recoveryActions: [] as RecoveryAction[],
  summary: "",
  isLoading: false,
  error: null,
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useAiStore = create<AiStoreState>()((set, get) => ({
  ...DEFAULT_DIAGNOSTICS,

  loadDiagnostics() {
    set({ isLoading: true, error: null });

    try {
      const eventStore = useEventLogStore.getState();
      const metricsStore = useMetricsStore.getState();
      const backupStore = useBackupStore.getState();
      const recoveryStore = useRecoveryStore.getState();
      const maintenanceStore = useMaintenanceStore.getState();

      // Ensure demo data is seeded if in demo mode
      if (checkDemoMode()) {
        if (eventStore.events.length === 0) eventStore.seedDemo();
        if (metricsStore.metrics.length === 0) metricsStore.seedDemo();
        if (backupStore.backups.length === 0) backupStore.seedDemo();
        if (recoveryStore.actions.length === 0) recoveryStore.seedDemo();
      }

      const events = eventStore.events;
      const snapshot = metricsStore.snapshot;
      const maintenanceConfig = maintenanceStore.config;

      /* ---- System health ---- */
      let systemHealth: SystemHealth = "healthy";
      if (snapshot) {
        systemHealth = snapshot.overall;
      } else {
        const criticalCount = events.filter((e) => e.level === "critical").length;
        const errorCount = events.filter((e) => e.level === "error").length;
        if (criticalCount >= 2) {
          systemHealth = "down";
        } else if (criticalCount > 0 || errorCount >= 5) {
          systemHealth = "degraded";
        }
      }

      /* ---- Failed transactions 24h ---- */
      const failedTransactions24h = events.filter(
        (e) =>
          (e.level === "error" || e.level === "critical") &&
          e.category === "transaction",
      ).length;

      /* ---- Offline branches ---- */
      const offlineBranchEvents = events.filter(
        (e) => e.category === "network" && e.level !== "info",
      );
      const uniqueOfflinePharmacyIds = new Set(
        offlineBranchEvents.map((e) => e.pharmacyId).filter(Boolean),
      );
      const offlineBranches =
        uniqueOfflinePharmacyIds.size > 0
          ? uniqueOfflinePharmacyIds.size
          : offlineBranchEvents.length > 0
            ? 1
            : 0;

      /* ---- Sync backlog ---- */
      const syncMetrics = metricsStore.getByName("sync.pending_count");
      const syncBacklog =
        syncMetrics.length > 0
          ? (syncMetrics[syncMetrics.length - 1]?.value ?? 0)
          : 0;

      /* ---- Maintenance status ---- */
      const maintenanceStatus = maintenanceConfig.mode;

      /* ---- Last backup ---- */
      const latestBackup = backupStore.getLatest();
      const lastBackup = latestBackup?.completedAt ?? null;

      /* ---- Recovery actions ---- */
      const recoveryActions = recoveryStore.actions;

      /* ---- Active alerts ---- */
      const alerts: AiAlert[] = [];

      for (const evt of events) {
        if (evt.level === "critical") {
          alerts.push({
            id: `alert-evt-${evt.id}`,
            level: "critical",
            category: evt.category,
            message: evt.message,
            timestamp: evt.timestamp,
            acknowledged: false,
          });
        }
      }

      for (const evt of events) {
        if (evt.level === "error") {
          alerts.push({
            id: `alert-evt-${evt.id}`,
            level: "warn",
            category: evt.category,
            message: evt.message,
            timestamp: evt.timestamp,
            acknowledged: false,
          });
        }
      }

      if (maintenanceStatus !== "none") {
        alerts.push({
          id: "alert-maintenance",
          level: "warn",
          category: "maintenance",
          message: `Mode maintenance: ${maintenanceStatus}`,
          timestamp: maintenanceConfig.startedAt ?? new Date().toISOString(),
          acknowledged: false,
        });
      }

      const failedRecoveryActions = recoveryActions.filter(
        (a) => a.status === "failed",
      );
      for (const action of failedRecoveryActions) {
        alerts.push({
          id: `alert-rec-${action.id}`,
          level: "critical",
          category: "recovery",
          message: `Recovery gagal: ${action.type}${action.error ? ` — ${action.error}` : ""}`,
          timestamp: action.lastAttempt ?? new Date().toISOString(),
          acknowledged: false,
        });
      }

      // Merge with existing acknowledged state
      const existingAlerts = get().activeAlerts;
      const acknowledgedIds = new Set(
        existingAlerts
          .filter((a) => a.acknowledged)
          .map((a) => a.id),
      );
      for (const alert of alerts) {
        if (acknowledgedIds.has(alert.id)) {
          alert.acknowledged = true;
        }
      }

      // Sort: level (critical first), then timestamp (newest first)
      alerts.sort((a, b) => {
        const lv = alertLevelValue(a.level) - alertLevelValue(b.level);
        if (lv !== 0) return lv;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      /* ---- Summary ---- */
      const summary = buildSummary({
        systemHealth,
        failedTransactions24h,
        offlineBranches,
        syncBacklog,
        maintenanceStatus,
        lastBackup,
        recoveryActions,
        activeAlerts: alerts,
      });

      /* ---- Recent events ---- */
      const recentEvents = eventStore.getRecent(10);

      set({
        systemHealth,
        activeAlerts: alerts,
        recentEvents,
        syncBacklog,
        failedTransactions24h,
        offlineBranches,
        maintenanceStatus,
        lastBackup,
        recoveryActions,
        summary,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error
            ? err.message
            : "Gagal memuat diagnostik sistem",
      });
    }
  },

  acknowledgeAlert(id: string) {
    set((s) => ({
      activeAlerts: s.activeAlerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a,
      ),
    }));
  },

  clear() {
    set({ ...DEFAULT_DIAGNOSTICS });
  },
}));
