"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Loader2,
  Ban,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useMaintenanceStore } from "@/store/maintenance-store";
import { useAiStore } from "@/store/ai-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { cn } from "@/lib/cn";
import type { MaintenanceMode } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ModeOption {
  value: MaintenanceMode;
  label: string;
  description: string;
  icon: typeof Wrench;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "none",
    label: "None",
    description: "Tidak ada pemeliharaan aktif",
    icon: CheckCircle,
  },
  {
    value: "readonly",
    label: "Readonly",
    description: "Hanya baca — pengguna tidak dapat mengubah data",
    icon: Info,
  },
  {
    value: "scheduled",
    label: "Scheduled",
    description: "Pemeliharaan terjadwal",
    icon: Clock,
  },
  {
    value: "full",
    label: "Full",
    description: "Pemeliharaan penuh — semua akses diblokir",
    icon: Ban,
  },
];

const MODE_BADGE: Record<
  MaintenanceMode,
  { bg: string; text: string; dot: string }
> = {
  none: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
  },
  readonly: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  scheduled: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  full: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
};

const MODE_LABELS: Record<MaintenanceMode, string> = {
  none: "Tidak Ada",
  readonly: "Hanya Baca",
  scheduled: "Terjadwal",
  full: "Penuh",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

const MAINTENANCE_LOG_ENTRIES = [
  {
    id: "log-1",
    action: "Maintenance mode diubah ke readonly",
    timestamp: "2026-05-20T14:30:00Z",
    type: "info" as const,
  },
  {
    id: "log-2",
    action: "Maintenance mode dinonaktifkan",
    timestamp: "2026-05-19T09:15:00Z",
    type: "success" as const,
  },
  {
    id: "log-3",
    action: "Maintenance penuh diaktifkan untuk pemeliharaan database",
    timestamp: "2026-05-19T08:00:00Z",
    type: "warning" as const,
  },
  {
    id: "log-4",
    action: "Maintenance terjadwal: pembaruan sistem v2.4.1",
    timestamp: "2026-05-18T22:00:00Z",
    type: "info" as const,
  },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function PlatformMaintenancePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isSystemUser = useAuthStore((s) => s.isSystemUser());
  const {
    config,
    isActive,
    isReadonly,
    enableReadonly,
    enableFull,
    schedule,
    disable,
  } = useMaintenanceStore();
  const { loadDiagnostics } = useAiStore();

  const [selectedMode, setSelectedMode] = useState<MaintenanceMode>(config.mode);
  const [messageInput, setMessageInput] = useState(config.message);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");

  /* ---- Auth guard ---- */
  useEffect(() => {
    if (!isLoading && isAuthenticated && !isPlatformUser(user?.role)) {
      router.replace("/unauthorized");
    }
  }, [isLoading, isAuthenticated, user?.role, router]);

  if (isLoading || !isAuthenticated) return null;

  /* ---- Auth gate ---- */
  if (!isSystemUser) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-950/30">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
          Akses Ditolak
        </h2>
        <p className="max-w-xs text-sm text-neutral-500">
          Halaman ini hanya dapat diakses oleh Super Admin, Developer, dan Support.
        </p>
      </div>
    );
  }

  /* ---- Handlers ---- */
  function handleApplyMode() {
    if (selectedMode === "none") {
      disable();
    } else if (selectedMode === "readonly") {
      enableReadonly(messageInput || undefined);
    } else if (selectedMode === "full") {
      enableFull(messageInput || undefined);
    } else if (selectedMode === "scheduled") {
      if (!scheduleStart || !scheduleEnd) return;
      schedule(scheduleStart, scheduleEnd, messageInput || undefined);
    }
    loadDiagnostics();
  }

  function handleDisable() {
    disable();
    setSelectedMode("none");
    setMessageInput("");
    loadDiagnostics();
  }

  /* ---- Derived state ---- */
  const badge = MODE_BADGE[config.mode];
  const isScheduled = selectedMode === "scheduled";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Maintenance Center
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Kelola mode pemeliharaan dan pantau status sistem platform.
        </p>
      </div>

      {/* Current status */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Status Maintenance Saat Ini
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", badge.bg)}>
              <Wrench className={cn("h-5 w-5", badge.text)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", badge.dot)} />
                <span className={cn("text-sm font-semibold", badge.text)}>
                  {MODE_LABELS[config.mode]}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-500">
                {config.message || "Tidak ada pesan maintenance"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              <span>
                {isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Mulai: {formatTimestamp(config.startedAt)}
              </span>
            </div>
            {config.scheduledEndAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Selesai: {formatTimestamp(config.scheduledEndAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Maintenance mode controls */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Atur Mode Pemeliharaan
        </h2>

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedMode === opt.value;

            return (
              <button
                key={opt.value}
                onClick={() => setSelectedMode(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all",
                  isSelected
                    ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100 dark:border-brand-500 dark:bg-brand-950/30 dark:ring-brand-900/30"
                    : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:bg-neutral-800",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    isSelected
                      ? "bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      isSelected
                        ? "text-brand-700 dark:text-brand-300"
                        : "text-neutral-700 dark:text-neutral-300",
                    )}
                  >
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Message input */}
        <div className="mt-4">
          <label className="mb-1.5 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            Pesan Maintenance
          </label>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Alasan atau deskripsi pemeliharaan..."
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/30"
          />
        </div>

        {/* Schedule inputs (only for scheduled mode) */}
        {isScheduled && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Jadwal Mulai
              </label>
              <input
                type="datetime-local"
                value={scheduleStart}
                onChange={(e) => setScheduleStart(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:border-brand-500 dark:focus:ring-brand-900/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Jadwal Selesai
              </label>
              <input
                type="datetime-local"
                value={scheduleEnd}
                onChange={(e) => setScheduleEnd(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:border-brand-500 dark:focus:ring-brand-900/30"
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleApplyMode}
            disabled={
              selectedMode === config.mode &&
              messageInput === config.message &&
              !isScheduled
            }
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-40 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            <Wrench className="h-3.5 w-3.5" />
            Terapkan Mode
          </button>
          {isActive && (
            <button
              onClick={handleDisable}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Nonaktifkan
            </button>
          )}
        </div>
      </div>

      {/* Maintenance Schedule Section (Placeholder) */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Jadwal Pemeliharaan
        </h2>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 py-8 text-center dark:border-neutral-600">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <Clock className="h-5 w-5 text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Segera Hadir
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Fitur penjadwalan pemeliharaan terintegrasi akan tersedia pada rilis berikutnya.
            </p>
          </div>
        </div>
      </div>

      {/* Maintenance Log Table */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Log Pemeliharaan
          </h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Aksi
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Waktu
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Tipe
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {MAINTENANCE_LOG_ENTRIES.map((entry) => (
                <tr
                  key={entry.id}
                  className="bg-white transition-colors hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
                >
                  <td className="px-4 py-3">
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] text-neutral-500">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium",
                        entry.type === "warning" && "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
                        entry.type === "info" && "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
                        entry.type === "success" && "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
                      )}
                    >
                      {entry.type === "warning" && <AlertTriangle className="h-3 w-3" />}
                      {entry.type === "info" && <Info className="h-3 w-3" />}
                      {entry.type === "success" && <CheckCircle className="h-3 w-3" />}
                      {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {MAINTENANCE_LOG_ENTRIES.length === 0 && (
            <div className="flex flex-col items-center gap-3 bg-white py-12 text-center dark:bg-neutral-900">
              <Activity className="h-6 w-6 text-neutral-300" />
              <p className="text-xs text-neutral-400">Belum ada log pemeliharaan</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-[10px] text-neutral-400">
          Menampilkan riwayat perubahan mode pemeliharaan terbaru.
        </p>
      </div>
    </div>
  );
}
