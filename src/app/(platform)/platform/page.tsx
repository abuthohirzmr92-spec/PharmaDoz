"use client";

import { useEffect } from "react";
import { Shield, Store, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useSuperAdminStore } from "@/store/super-admin-store";
import Link from "next/link";
import { PlatformStatCards, PlatformPackageCards } from "@/components/admin/platform-stats";
import { AppBadge } from "@/components/ui/app-badge";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { sleKpiCards, attentionItems } from "@/lib/subscription/platform-dashboard-model";
import { platformHealthHero } from "@/lib/subscription/platform-health-model";
import { dashboardService } from "@/lib/services/dashboard-service";
import type { PlatformOverview } from "@/types/subscription-dtos";
import type { PlatformStats } from "@/types";

export default function PlatformPage() {
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

  const displayStats: PlatformStats = stats ?? {
    totalPharmacies: 0,
    totalUsers: 0,
    pendingExpansions: 0,
    activePackages: { basic: 0, professional: 0, enterprise: 0 },
  };
  const isDemo = checkDemoMode();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Dashboard Platform
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Super Admin &mdash; Platform Overview
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

      {/* ─── SLE Operations Section ─── */}
      <SleOperationsSection />

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

/* ─── SLE Operations Section (enhanced dashboard) ─── */
function SleOperationsSection() {
  const { data, loading, error } = useAsync<PlatformOverview>(
    () => dashboardService.getPlatformOverview(),
    [],
  );

  const kpis = data ? sleKpiCards(data) : [];
  const attention = data ? attentionItems(data) : [];
  const hero = platformHealthHero({ schedulerOk: true, providerOk: true, billingOk: true, databaseOk: true });

  const attByPriority = { critical: attention.filter((a) => a.tone === "danger"), high: attention.filter((a) => a.tone === "warning"), medium: attention.filter((a) => a.tone === "info") };

  return (
    <div className="space-y-4">
      {/* System Health Hero — above Attention Center */}
      <div className="flex items-center justify-between rounded-2xl border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>{hero.icon}</span>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{hero.label}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
              {hero.items.map((i) => (
                <span key={i.label} className="text-xs text-neutral-500">{i.ok ? "🟢" : "🔴"} {i.label}</span>
              ))}
            </div>
          </div>
        </div>
        <span className="text-xs text-neutral-400">Update terakhir: {new Date().toLocaleTimeString("id-ID")}</span>
      </div>

      {/* Attention Center */}
      {attention.length > 0 && (
        <WidgetShell title="⚠️ Pusat Perhatian" loading={false} error={null}>
          <div className="space-y-3">
            {(["critical", "high", "medium"] as const).map((pri) => {
              const items = attByPriority[pri];
              if (items.length === 0) return null;
              const label = pri === "critical" ? "Kritis" : pri === "high" ? "Penting" : "Sedang";
              return (
                <div key={pri}>
                  <p className="mb-1 text-xs font-medium text-neutral-500">{label}</p>
                  {items.map((a) => (
                    <Link key={a.key} href={a.href}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50">
                      <span className={a.tone === "danger" ? "text-red-700 dark:text-red-400 font-medium" : a.tone === "warning" ? "text-amber-700 dark:text-amber-400 font-medium" : "text-blue-700 dark:text-blue-400 font-medium"}>{a.message}</span>
                      <span className="text-xs text-neutral-400">→</span>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </WidgetShell>
      )}

      {/* SLE KPI Cards with Drilldown */}
      <WidgetShell title="Ringkasan Langganan" loading={loading} error={error} isEmpty={kpis.length === 0}>
        <p className="mb-2 text-xs text-neutral-400">Update terakhir: {new Date().toLocaleTimeString("id-ID")}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => (
            <Link key={k.key} href={k.href ?? "#"} className="rounded-xl border border-neutral-200 p-3 text-center hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50">
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{k.value}</p>
              <p className="text-xs text-neutral-500">{k.label}</p>
              <AppBadge variant={k.tone}>{k.tone}</AppBadge>
            </Link>
          ))}
        </div>
      </WidgetShell>

      {/* Quick links to subscription management pages */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {[
          { label: "Langganan", href: "/platform/subscriptions" },
          { label: "Invoice", href: "/platform/billing" },
          { label: "Trial", href: "/platform/trials" },
          { label: "Promosi", href: "/platform/promotions" },
        ].map((l) => (
          <Link key={l.href} href={l.href}
            className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800">
            {l.label} →
          </Link>
        ))}
      </div>
    </div>
  );
}
