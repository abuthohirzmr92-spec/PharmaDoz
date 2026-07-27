"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePackageStore } from "@/store/package-store";
import { useAuthStore } from "@/store/auth-store";
import { isSystemRole } from "@/lib/auth/permissions";
import { Shield, Plus, Pencil, Trash2, Package, Eye } from "lucide-react";
import type { PackageRow } from "@/lib/repositories/package";
import { packagePresentation } from "@/config/package-presentation";
import { AppBadge } from "@/components/ui/app-badge";

function formatRupiah(amount: number): string {
  if (amount === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export default function PackagesPage() {
  const { user } = useAuthStore();
  const { packages, loadPackages, deletePackage, isLoading, error } = usePackageStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadPackages(); }, [loadPackages]);

  if (!user || !isSystemRole(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-8 w-8 text-neutral-400 mb-3" />
        <h2 className="text-sm font-semibold text-neutral-700">Akses Ditolak</h2>
        <p className="mt-1 text-sm text-neutral-500">Hanya Super Admin yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  const handleDelete = async (pkg: PackageRow) => {
    if (!window.confirm(`Hapus paket "${pkg.label}"?\n\nPaket custom yang tidak digunakan oleh tenant manapun dapat dihapus.`)) return;
    setDeletingId(pkg.id);
    await deletePackage(pkg.id);
    setDeletingId(null);
  };

  const featureCount = (pkg: PackageRow) => Object.values(pkg.featureFlags ?? {}).filter(Boolean).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Paket Langganan</h1>
          <p className="mt-1 text-sm text-neutral-500">Kelola paket dan fitur yang tersedia untuk tenant</p>
        </div>
        <Link
          href="/platform/packages/create"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />Buat Paket
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <Package className="h-8 w-8 text-neutral-400 mb-3" />
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Belum ada paket</h3>
          <p className="mt-1 text-sm text-neutral-500">Buat paket langganan pertama untuk tenant.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const pres = packagePresentation(pkg.name);
            return (
              <div key={pkg.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">{pkg.label}</h3>
                    <p className="text-xs text-neutral-400">{pkg.name}</p>
                  </div>
                  <AppBadge variant={pkg.isActive ? "success" : "neutral"}>{pkg.isActive ? "Aktif" : "Nonaktif"}</AppBadge>
                </div>

                {/* Preview panel — how this looks in the Owner Portal */}
                <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/30 p-3 dark:border-brand-800 dark:bg-brand-950/20">
                  <p className="mb-1 text-xs font-medium text-brand-700 dark:text-brand-300"><Eye className="inline h-3 w-3 mr-1" />Preview Owner</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400"><span className="font-medium">Untuk:</span> {pres.recommendedFor}</p>
                  {pres.highlights.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {pres.highlights.map((h) => (
                        <li key={h} className="text-xs text-neutral-600 dark:text-neutral-400">✔ {h}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-neutral-500">User</span><span className="text-right font-medium">{pkg.maxUsers}</span>
                  <span className="text-neutral-500">Cabang</span><span className="text-right font-medium">{pkg.maxBranches}</span>
                  <span className="text-neutral-500">Produk</span><span className="text-right font-medium">{pkg.maxProducts}</span>
                  <span className="text-neutral-500">Fitur</span><span className="text-right font-medium">{featureCount(pkg)}</span>
                  <span className="text-neutral-500">Harga</span><span className="text-right font-semibold">{formatRupiah(pkg.monthlyPrice)}</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${pkg.isCustom ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400" : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"}`}>
                    {pkg.isCustom ? "Custom" : "Standar"}
                  </span>
                  <div className="flex gap-1">
                    <Link href={`/platform/packages/${pkg.id}/edit`} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"><Pencil className="h-4 w-4" /></Link>
                    {pkg.isCustom && (
                      <button onClick={() => handleDelete(pkg)} disabled={deletingId === pkg.id}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
