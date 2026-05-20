"use client";

import { useEffect } from "react";
import { Shield, Store, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { PlatformStatCards, PlatformPackageCards } from "@/components/admin/platform-stats";
import { isDemoMode as checkDemoMode } from "@/config/env";
import type { PlatformStats } from "@/types";

const PLACEHOLDER_STATS: PlatformStats = {
  totalPharmacies: 0,
  totalUsers: 0,
  pendingExpansions: 0,
  activePackages: { basic: 0, professional: 0, enterprise: 0 },
};

export default function AdminPage() {
  const isSystemUser = useAuthStore((s) => s.isSystemUser());
  const user = useAuthStore((s) => s.user);
  const { stats, isLoading, loadStats } = useSuperAdminStore();

  useEffect(() => {
    if (!checkDemoMode() && isSystemUser) {
      loadStats();
    }
  }, [isSystemUser, loadStats]);

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

  const displayStats = stats ?? PLACEHOLDER_STATS;
  const isDemo = checkDemoMode();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Platform Administration
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Kelola seluruh apotek, pengguna, dan paket dalam platform.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
            {isDemo ? "Data demo — belum terhubung ke database" : "Platform Administration"}
          </p>
          <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
            {isDemo
              ? "Fitur-fitur di bawah akan aktif setelah Supabase dikonfigurasi dan data tersedia."
              : "Ringkasan platform berdasarkan data real-time dari database."}
          </p>
        </div>
      </div>

      {/* User context */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {user?.displayName}
            </p>
            <p className="text-xs text-neutral-500">
              {user?.email} &middot; {user?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Platform Overview */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Ringkasan Platform
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-white py-12 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : (
          <PlatformStatCards stats={displayStats} />
        )}
        <p className="mt-3 text-[10px] text-neutral-400">
          {isDemo
            ? "Data ringkasan akan tersedia setelah database terhubung."
            : `Menampilkan ${displayStats.totalPharmacies} apotek, ${displayStats.totalUsers} pengguna.`}
        </p>
      </div>

      {/* Active Packages */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Paket Aktif
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-white py-12 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : (
          <PlatformPackageCards stats={displayStats} />
        )}
        <p className="mt-3 text-[10px] text-neutral-400">
          {isDemo
            ? "Distribusi paket akan tersedia setelah database terhubung."
            : "Distribusi paket berdasarkan tenant terdaftar."}
        </p>
      </div>

      {/* Store Expansion Requests */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Permintaan Pembukaan Toko Baru
        </h2>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white py-10 text-center dark:border-neutral-600 dark:bg-neutral-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <Store className="h-6 w-6 text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {displayStats.pendingExpansions > 0
                ? `${displayStats.pendingExpansions} permintaan menunggu persetujuan`
                : "Belum ada permintaan pembukaan toko baru"}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {displayStats.pendingExpansions > 0
                ? "Klik menu Ekspansi untuk review."
                : "Permintaan dari pemilik apotek akan muncul di sini."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
