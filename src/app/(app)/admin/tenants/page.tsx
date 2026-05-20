"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Shield,
  Search,
  Building2,
  Store,
  ChevronRight,
  Circle,
  Wrench,
  Ban,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useMaintenanceStore } from "@/store/maintenance-store";
import { useSuperAdminStore } from "@/store/super-admin-store";
import type { TenantSummary, TenantPackage } from "@/types";
import { cn } from "@/lib/cn";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { TenantDetailPanel } from "@/components/admin/tenant-detail-panel";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type StatusFilter = "all" | "active" | "inactive";

/* ------------------------------------------------------------------ */
/*  Demo placeholder data                                              */
/* ------------------------------------------------------------------ */

const DEMO_TENANTS: (TenantSummary & {
  maxUsers: number;
  maxBranches: number;
})[] = [
  {
    pharmacyId: "pharm-001",
    pharmacyName: "Apotek Sehat",
    packageName: "enterprise",
    ownerName: "Budi Santoso",
    userCount: 28,
    branchCount: 5,
    maxUsers: 50,
    maxBranches: 10,
    isActive: true,
    lastActiveAt: "2026-05-19T08:30:00Z",
    lastSyncAt: "2026-05-19T08:25:00Z",
    transactionVolume: 125000000,
    createdAt: "2025-01-15T00:00:00Z",
  },
  {
    pharmacyId: "pharm-002",
    pharmacyName: "Apotek Keluarga",
    packageName: "professional",
    ownerName: "Siti Rahmawati",
    userCount: 8,
    branchCount: 2,
    maxUsers: 10,
    maxBranches: 3,
    isActive: true,
    lastActiveAt: "2026-05-19T07:15:00Z",
    lastSyncAt: "2026-05-19T07:10:00Z",
    transactionVolume: 45000000,
    createdAt: "2025-03-20T00:00:00Z",
  },
  {
    pharmacyId: "pharm-003",
    pharmacyName: "Apotek 24 Jam",
    packageName: "professional",
    ownerName: "Hendra Wijaya",
    userCount: 10,
    branchCount: 3,
    maxUsers: 10,
    maxBranches: 3,
    isActive: true,
    lastActiveAt: "2026-05-18T22:45:00Z",
    lastSyncAt: "2026-05-18T22:40:00Z",
    transactionVolume: 78000000,
    createdAt: "2025-06-01T00:00:00Z",
  },
  {
    pharmacyId: "pharm-004",
    pharmacyName: "Apotek Medika",
    packageName: "basic",
    ownerName: "Dr. Andi Pratama",
    userCount: 3,
    branchCount: 1,
    maxUsers: 3,
    maxBranches: 1,
    isActive: false,
    lastActiveAt: "2026-04-28T16:00:00Z",
    lastSyncAt: "2026-04-28T15:55:00Z",
    transactionVolume: 12000000,
    createdAt: "2026-02-10T00:00:00Z",
  },
  {
    pharmacyId: "pharm-005",
    pharmacyName: "Apotek Sejahtera",
    packageName: "basic",
    ownerName: "Dewi Sartika",
    userCount: 2,
    branchCount: 1,
    maxUsers: 3,
    maxBranches: 1,
    isActive: true,
    lastActiveAt: "2026-05-17T14:20:00Z",
    lastSyncAt: "2026-05-17T14:15:00Z",
    transactionVolume: 8500000,
    createdAt: "2026-04-05T00:00:00Z",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const PACKAGE_BADGE: Record<
  TenantPackage,
  { bg: string; text: string; darkBg: string; darkText: string }
> = {
  basic: {
    bg: "bg-neutral-100",
    text: "text-neutral-600",
    darkBg: "dark:bg-neutral-800",
    darkText: "dark:text-neutral-400",
  },
  professional: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    darkBg: "dark:bg-blue-950/30",
    darkText: "dark:text-blue-300",
  },
  enterprise: {
    bg: "bg-green-50",
    text: "text-green-700",
    darkBg: "dark:bg-green-950/30",
    darkText: "dark:text-green-300",
  },
};

const PACKAGE_LABELS: Record<TenantPackage, string> = {
  basic: "Basic",
  professional: "Professional",
  enterprise: "Enterprise",
};

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "inactive", label: "Nonaktif" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 1) return "Baru saja";
    if (diffHours < 24) return `${diffHours} jam lalu`;

    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function getBarColor(percent: number): string {
  if (percent >= 0.8) return "bg-red-500";
  if (percent >= 0.6) return "bg-amber-500";
  return "bg-green-500";
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function TenantsPage() {
  const isSystemUser = useAuthStore((s) => s.isSystemUser());
  const maintenanceConfig = useMaintenanceStore((s) => s.config);
  const {
    tenants: liveTenants,
    isLoading,
    loadTenants,
    suspendTenant: suspend,
    activateTenant: activate,
  } = useSuperAdminStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedTenant, setSelectedTenant] = useState<
    (TenantSummary & { maxUsers: number; maxBranches: number }) | null
  >(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const isDemo = checkDemoMode();

  useEffect(() => {
    if (!isDemo && isSystemUser) {
      loadTenants();
    }
  }, [isDemo, isSystemUser, loadTenants]);

  /* ---- Build tenant list ---- */
  const sourceTenants = useMemo(() => {
    if (isDemo) return DEMO_TENANTS;
    return liveTenants.map((t) => ({
      ...t,
      maxUsers: 3,
      maxBranches: 1,
    }));
  }, [isDemo, liveTenants]);

  /* ---- Filtered tenants ---- */
  const filteredTenants = useMemo(() => {
    return sourceTenants.filter((t) => {
      const matchesSearch = t.pharmacyName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && t.isActive) ||
        (statusFilter === "inactive" && !t.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [sourceTenants, searchQuery, statusFilter]);

  const hasData = filteredTenants.length > 0;

  /* ---- Actions ---- */
  const handleSuspend = useCallback(async (tenantId: string) => {
    setActioningId(tenantId);
    const ok = await suspend(tenantId);
    if (ok) toast.success("Tenant dinonaktifkan");
    else toast.error("Gagal menonaktifkan tenant");
    setActioningId(null);
  }, [suspend]);

  const handleActivate = useCallback(async (tenantId: string) => {
    setActioningId(tenantId);
    const ok = await activate(tenantId);
    if (ok) toast.success("Tenant diaktifkan kembali");
    else toast.error("Gagal mengaktifkan tenant");
    setActioningId(null);
  }, [activate]);

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Manajemen Tenant
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Kelola dan pantau seluruh apotek yang terdaftar dalam platform.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari apotek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder-neutral-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/30"
          />
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors",
                statusFilter === tab.key
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && !isDemo ? (
        <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-white py-16 dark:border-neutral-700 dark:bg-neutral-900">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
            {hasData ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Apotek
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Paket
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Pengguna
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Cabang
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Terakhir Aktif
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredTenants.map((tenant) => {
                    const badge = PACKAGE_BADGE[tenant.packageName];
                    const userPercent = tenant.maxUsers > 0
                      ? tenant.userCount / tenant.maxUsers
                      : 0;
                    const isActing = actioningId === tenant.pharmacyId;

                    return (
                      <tr
                        key={tenant.pharmacyId}
                        className="bg-white transition-colors hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
                      >
                        {/* Pharmacy name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                {tenant.pharmacyName}
                              </p>
                              <p className="text-[10px] text-neutral-400">
                                {tenant.ownerName}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Package */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
                              badge.bg,
                              badge.text,
                              badge.darkBg,
                              badge.darkText,
                            )}
                          >
                            {PACKAGE_LABELS[tenant.packageName]}
                          </span>
                        </td>

                        {/* Users with bar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                  {tenant.userCount}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  /{tenant.maxUsers}
                                </span>
                              </div>
                              <div className="h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    getBarColor(userPercent),
                                  )}
                                  style={{
                                    width: `${Math.min(userPercent * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Branches */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-neutral-400" />
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                              {tenant.branchCount}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Circle
                              className={cn(
                                "h-2 w-2 fill-current",
                                tenant.isActive
                                  ? "text-green-500"
                                  : "text-neutral-300 dark:text-neutral-600",
                              )}
                            />
                            <span
                              className={cn(
                                "text-[11px] font-medium",
                                tenant.isActive
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-neutral-400",
                              )}
                            >
                              {tenant.isActive ? "Aktif" : "Nonaktif"}
                            </span>
                          </div>
                        </td>

                        {/* Last active */}
                        <td className="px-4 py-3">
                          <span className="text-[11px] text-neutral-500">
                            {formatDate(tenant.lastActiveAt)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isDemo && (
                              tenant.isActive ? (
                                <button
                                  onClick={() => handleSuspend(tenant.pharmacyId)}
                                  disabled={isActing}
                                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 disabled:opacity-50"
                                  title="Nonaktifkan tenant"
                                >
                                  {isActing ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Ban className="h-3 w-3" />
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivate(tenant.pharmacyId)}
                                  disabled={isActing}
                                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30 disabled:opacity-50"
                                  title="Aktifkan tenant"
                                >
                                  {isActing ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3" />
                                  )}
                                </button>
                              )
                            )}
                            <button
                              onClick={() => setSelectedTenant(tenant)}
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30"
                            >
                              Detail
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center gap-3 bg-white py-16 text-center dark:bg-neutral-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <Building2 className="h-6 w-6 text-neutral-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    {searchQuery
                      ? "Tidak ada apotek yang sesuai pencarian"
                      : isDemo
                        ? "Belum ada tenant terdaftar"
                        : "Tidak ada tenant di database"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {searchQuery
                      ? "Coba ubah kata kunci pencarian"
                      : isDemo
                        ? "Tenant akan muncul setelah pendaftaran pertama."
                        : "Buat tenant pertama melalui seed script atau registrasi."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Count */}
          <p className="text-[10px] text-neutral-400">
            Menampilkan {filteredTenants.length} dari {sourceTenants.length} tenant
            {!isDemo && " (live data)"}
          </p>
        </>
      )}

      {/* Detail Panel */}
      <TenantDetailPanel
        tenant={
          selectedTenant ?? {
            pharmacyId: "",
            pharmacyName: "",
            packageName: "basic",
            ownerName: "",
            userCount: 0,
            branchCount: 0,
            maxUsers: 0,
            maxBranches: 0,
            isActive: false,
            lastActiveAt: null,
            lastSyncAt: null,
            transactionVolume: 0,
            createdAt: "",
          }
        }
        open={selectedTenant !== null}
        onClose={() => setSelectedTenant(null)}
      />
    </div>
  );
}
