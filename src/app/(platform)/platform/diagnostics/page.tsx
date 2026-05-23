"use client";

import { useEffect } from "react";
import { AlertCircle, Brain } from "lucide-react";
import { useAiStore } from "@/store/ai-store";
import DiagnosticsOverview from "@/components/ai/diagnostics-overview";
import AlertList from "@/components/ai/alert-list";
import DiagnosticsSummary from "@/components/ai/diagnostics-summary";
import AuthDiagnosticsPanel from "@/components/diagnostics/auth-diagnostics-panel";
import { isDemoMode as checkDemoMode } from "@/config/env";

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function PlatformDiagnosticsPage() {
  const {
    systemHealth,
    activeAlerts,
    syncBacklog,
    failedTransactions24h,
    offlineBranches,
    recentEvents,
    maintenanceStatus,
    lastBackup,
    recoveryActions,
    summary,
    isLoading,
    error,
    loadDiagnostics,
    acknowledgeAlert,
  } = useAiStore();

  const isDemo = checkDemoMode();

  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics]);

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
            AI Diagnostics
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Pemantauan sistem otomatis dan analisis kesehatan platform
          </p>
        </div>

        {/* Loading skeleton */}
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
          </div>
          <div className="h-48 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-32 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
        </div>
      </div>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
            AI Diagnostics
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Pemantauan sistem otomatis dan analisis kesehatan platform
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
              Gagal Memuat Data
            </h2>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400/80">
              {error}
            </p>
          </div>
          <button
            onClick={() => loadDiagnostics()}
            className="mt-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  /* ---- Main content ---- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          AI Diagnostics
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Pemantauan sistem otomatis dan analisis kesehatan platform
        </p>
      </div>

      {/* Demo info banner */}
      {isDemo && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <Brain className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Mode Demo — Data Diagnostik Samaran
            </p>
            <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
              Data diagnostik ini dihasilkan dari sampel untuk tujuan demonstrasi.
              Integrasi database akan menggantikannya dengan data real-time.
            </p>
          </div>
        </div>
      )}

      {/* Diagnostics overview */}
      <DiagnosticsOverview
        systemHealth={systemHealth}
        activeAlerts={activeAlerts.length}
        syncBacklog={syncBacklog}
        failedTransactions24h={failedTransactions24h}
        offlineBranches={offlineBranches}
      />

      {/* Alert list + Summary side by side on large screens */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Alert list — takes 3/5 on large */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Peringatan Aktif ({activeAlerts.length})
            </h2>
          </div>
          <AlertList
            alerts={activeAlerts}
            onAcknowledge={acknowledgeAlert}
          />
        </div>

        {/* AI Summary — takes 2/5 on large */}
        <div className="lg:col-span-2">
          <DiagnosticsSummary
            summary={summary}
            lastBackup={lastBackup}
            maintenanceStatus={maintenanceStatus}
            recoveryActionCount={recoveryActions.length}
            showSoonBadge={true}
          />
        </div>
      </div>

      {/* Auth Hydration Diagnostics */}
      <AuthDiagnosticsPanel />
    </div>
  );
}
