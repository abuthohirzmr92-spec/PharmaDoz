"use client";

import { useState } from "react";
import {
  DatabaseBackup, DatabaseZap, Power, Stethoscope,
  AlertTriangle, Trash2, ScrollText, Shield,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { usePermission } from "@/hooks/use-auth";
import { AppBadge } from "@/components/ui/app-badge";
import { FactoryResetWizard } from "@/components/settings/factory-reset";

export default function MaintenancePage() {
  const user = useAuthStore((s) => s.user);
  const canViewSettings = usePermission("settings.view");
  const canEditSettings = usePermission("settings.edit");

  const [showResetWizard, setShowResetWizard] = useState(false);

  if (!canViewSettings) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-neutral-700">Akses Ditolak</h2>
        <p className="max-w-xs text-sm text-neutral-500">Anda tidak memiliki izin untuk mengakses halaman Maintenance.</p>
      </div>
    );
  }

  const tenantId = user?.tenantId;
  const userId = user?.id;
  const canReset = canEditSettings && Boolean(tenantId) && Boolean(userId);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Maintenance</h2>
        <p className="text-xs text-neutral-500">Enterprise Maintenance Center — operasi pemeliharaan tingkat lanjut</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Backup Database */}
        <MaintenanceCard
          icon={DatabaseBackup} accent="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
          title="Backup Database" description="Cadangkan seluruh data tenant ke penyimpanan aman."
        />

        {/* Restore Database */}
        <MaintenanceCard
          icon={DatabaseZap} accent="bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400"
          title="Restore Database" description="Pulihkan data tenant dari cadangan sebelumnya."
        />

        {/* Maintenance Mode */}
        <MaintenanceCard
          icon={Power} accent="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
          title="Maintenance Mode" description="Nonaktifkan sementara akses operasional untuk pemeliharaan."
        />

        {/* Diagnostics */}
        <MaintenanceCard
          icon={Stethoscope} accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
          title="Diagnostics" description="Periksa kesehatan sistem, koneksi, dan integritas data."
        />

        {/* Factory Reset — ACTIVE */}
        <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-900 dark:bg-red-950/30">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Factory Reset</h3>
              <AppBadge variant="danger">Active</AppBadge>
            </div>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Hapus seluruh data operasional (transaksi, inventaris, batch). Master data dipertahankan. Tidak dapat dibatalkan.
            </p>
            <button
              type="button"
              onClick={() => setShowResetWizard(true)}
              disabled={!canReset}
              className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
            >
              Buka Wizard
            </button>
            {!canEditSettings && (
              <p className="mt-2 text-xs text-red-500">Anda tidak memiliki izin untuk menjalankan Factory Reset.</p>
            )}
          </div>
        </div>

        {/* Hard Reset */}
        <MaintenanceCard
          icon={Trash2} accent="bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
          title="Hard Reset" description="Reset menyeluruh termasuk master data. Operasi destruktif penuh."
        />

        {/* Audit Log */}
        <MaintenanceCard
          icon={ScrollText} accent="bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400"
          title="Audit Log" description="Riwayat lengkap aktivitas & perubahan data tenant."
        />
      </div>

      {showResetWizard && tenantId && userId && (
        <FactoryResetWizard
          tenantId={tenantId}
          userId={userId}
          onClose={() => setShowResetWizard(false)}
        />
      )}
    </div>
  );
}

// Disabled "Coming Soon" maintenance card.
function MaintenanceCard({
  icon: Icon, accent, title, description,
}: {
  icon: typeof Power; accent: string; title: string; description: string;
}) {
  return (
    <div
      aria-disabled="true"
      className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5 opacity-70 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>
          <AppBadge variant="warning">Coming Soon</AppBadge>
        </div>
        <p className="mt-1 text-xs text-neutral-500">{description}</p>
      </div>
    </div>
  );
}
