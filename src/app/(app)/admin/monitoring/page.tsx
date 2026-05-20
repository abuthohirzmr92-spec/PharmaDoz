"use client";

import { useEffect, useMemo } from "react";
import {
  Shield,
  Store,
  Building,
  AlertCircle,
  WifiOff,
  RefreshCw,
  Wrench,
  AlertTriangle,
  Clock,
  Activity,
  FileText,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useMaintenanceStore } from "@/store/maintenance-store";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { HealthMetricsCard } from "@/components/admin/health-metrics-card";
import AuditLogTable from "@/components/admin/audit-log-table";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HealthCard {
  key: string;
  label: string;
  icon: typeof Store;
  value: number | string;
  color: "green" | "red" | "amber" | "blue" | "neutral";
}

interface ActivityEntry {
  id: string;
  description: string;
  timestamp: string;
  type: "error" | "warning" | "info" | "success";
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const DEMO_HEALTH = {
  activeTenants: 12,
  totalTenants: 18,
  failedTransactions24h: 3,
  offlineTenants: 2,
  syncFailures24h: 1,
  activeMaintenances: 1,
  quotaAlerts: 2,
  updatedAt: new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
};

const DEMO_ACTIVITIES: ActivityEntry[] = [
  {
    id: "1",
    description: "Tenant Apotek Sehat mencapai 80% kuota user",
    timestamp: "5 menit yang lalu",
    type: "warning",
  },
  {
    id: "2",
    description: "Sync batch pharm-001 gagal setelah 3 attempt",
    timestamp: "12 menit yang lalu",
    type: "error",
  },
  {
    id: "3",
    description: "Maintenance dijadwalkan untuk Apotek Sehat",
    timestamp: "28 menit yang lalu",
    type: "info",
  },
  {
    id: "4",
    description: "Apotek Keluarga berhasil sinkronisasi batch #042",
    timestamp: "1 jam yang lalu",
    type: "success",
  },
  {
    id: "5",
    description: "Quota penyimpanan Apotek Sejahtera mencapai 90%",
    timestamp: "2 jam yang lalu",
    type: "warning",
  },
  {
    id: "6",
    description: "Koneksi terputus — Apotek Harapan Sehat (offline 4 jam)",
    timestamp: "4 jam yang lalu",
    type: "error",
  },
  {
    id: "7",
    description: "Pembaruan sistem berhasil: v2.4.1 deployed ke semua tenant",
    timestamp: "6 jam yang lalu",
    type: "success",
  },
];

/* ------------------------------------------------------------------ */
/*  Color map                                                          */
/* ------------------------------------------------------------------ */

const COLOR_STYLES: Record<
  HealthCard["color"],
  { icon: string; bg: string; value: string; border: string }
> = {
  green: {
    icon: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
    value: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-900",
  },
  red: {
    icon: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    value: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-900",
  },
  amber: {
    icon: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    value: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900",
  },
  blue: {
    icon: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    value: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900",
  },
  neutral: {
    icon: "text-neutral-500",
    bg: "bg-neutral-50 dark:bg-neutral-800",
    value: "text-neutral-700 dark:text-neutral-300",
    border: "border-neutral-200 dark:border-neutral-700",
  },
};

const ACTIVITY_STYLES: Record<
  ActivityEntry["type"],
  { dot: string; bg: string }
> = {
  error: { dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
  info: { dot: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
  success: { dot: "bg-green-500", bg: "bg-green-50 dark:bg-green-950/20" },
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function MonitoringPage() {
  const isSystemUser = useAuthStore((s) => s.isSystemUser());
  const maintenanceConfig = useMaintenanceStore((s) => s.config);
  const { health, activities, loadHealth, loadActivities } = useSuperAdminStore();

  const isDemo = checkDemoMode();

  useEffect(() => {
    if (!isDemo && isSystemUser) {
      loadHealth();
      loadActivities();
    }
  }, [isDemo, isSystemUser, loadHealth, loadActivities]);

  const healthCards: HealthCard[] = useMemo(() => {
    const h = isDemo ? DEMO_HEALTH : (health ?? {
      activeTenants: 0,
      totalTenants: 0,
      failedTransactions24h: 0,
      offlineTenants: 0,
      syncFailures24h: 0,
      activeMaintenances: 0,
      quotaAlerts: 0,
      updatedAt: new Date().toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    const fmtDate = typeof h.updatedAt === "string" && h.updatedAt.includes("T")
      ? new Date(h.updatedAt).toLocaleString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : h.updatedAt;

    return [
      { key: "activeTenants", label: "Active Tenants", icon: Store, value: h.activeTenants, color: "green" as const },
      { key: "totalTenants", label: "Total Tenants", icon: Building, value: h.totalTenants, color: "blue" as const },
      { key: "failedTransactions24h", label: "Failed Tx 24h", icon: AlertCircle, value: h.failedTransactions24h, color: "red" as const },
      { key: "offlineTenants", label: "Offline Tenants", icon: WifiOff, value: h.offlineTenants, color: "amber" as const },
      { key: "syncFailures24h", label: "Sync Failures 24h", icon: RefreshCw, value: h.syncFailures24h, color: "red" as const },
      { key: "activeMaintenances", label: "Maintenances", icon: Wrench, value: h.activeMaintenances, color: "blue" as const },
      { key: "quotaAlerts", label: "Quota Alerts", icon: AlertTriangle, value: h.quotaAlerts, color: "amber" as const },
      { key: "updatedAt", label: "Last Updated", icon: Clock, value: fmtDate, color: "neutral" as const },
    ];
  }, [isDemo, health]);

  const displayActivities: ActivityEntry[] = isDemo
    ? DEMO_ACTIVITIES
    : activities.slice(0, 10).map((a) => ({
        id: a.id,
        description: a.action,
        timestamp: formatRelative(a.createdAt),
        type: "info" as const,
      }));

  /* ---- Maintenance gate ---- */
  if (maintenanceConfig.mode === "full") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/30">
          <Wrench className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
          Pemeliharaan
        </h2>
        <p className="max-w-xs text-sm text-neutral-500">
          Halaman admin tidak tersedia selama pemeliharaan penuh.
        </p>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Monitoring Platform
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Status kesehatan platform, aktivitas tenant, dan alert secara {isDemo ? "demo" : "real-time"}.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
            {isDemo ? "Data demo — belum terhubung ke database" : "Live data — terhubung ke Supabase"}
          </p>
          <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
            {isDemo
              ? "Angka-angka di bawah adalah data placeholder. Integrasi database akan menggantikannya dengan data real-time."
              : "Data berasal dari database Supabase production."}
          </p>
        </div>
      </div>

      {/* Health cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {healthCards.map((card) => {
          const Icon = card.icon;
          const cs = COLOR_STYLES[card.color];

          return (
            <div
              key={card.key}
              className={cn(
                "rounded-xl border bg-white p-4 dark:bg-neutral-900",
                cs.border,
                card.key === "updatedAt"
                  ? "col-span-2 sm:col-span-3 lg:col-span-1"
                  : "",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    cs.bg,
                  )}
                >
                  <Icon className={cn("h-4 w-4", cs.icon)} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  {card.label}
                </span>
              </div>
              <p className={cn("mt-2 text-lg font-bold tabular-nums", cs.value)}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Health Metrics KPI */}
      <HealthMetricsCard />

      {/* Activity log */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Activity Log
          </h2>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          {displayActivities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Activity className="h-6 w-6 text-neutral-300" />
              <p className="text-xs text-neutral-400">Belum ada aktivitas tercatat</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {displayActivities.map((entry) => {
                const as = ACTIVITY_STYLES[entry.type];
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 px-4 py-3"
                  >
                    <div className="mt-1.5 flex shrink-0">
                      <div className={cn("h-2 w-2 rounded-full", as.dot)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-700 dark:text-neutral-300">
                        {entry.description}
                      </p>
                      <p className="mt-0.5 text-[10px] text-neutral-400">
                        {entry.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <p className="mt-3 text-[10px] text-neutral-400">
          {isDemo
            ? "Activity log real-time akan tersedia setelah integrasi database."
            : `${displayActivities.length} aktivitas terbaru dari database.`}
        </p>
      </div>

      {/* Audit Trail */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Audit Trail
          </h2>
        </div>
        <AuditLogTable />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatRelative(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;

    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}
