"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePackageStore } from "@/store/package-store";
import { useAuthStore } from "@/store/auth-store";
import { isSystemRole } from "@/lib/auth/permissions";
import { Shield, Plus, Pencil, Trash2, Package } from "lucide-react";
import type { PackageRow } from "@/lib/repositories/package";

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

  const featureCount = (pkg: PackageRow) => Object.values(pkg.feature_flags).filter(Boolean).length;

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
        <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                <th className="px-4 py-3 font-medium text-neutral-500">Paket</th>
                <th className="px-4 py-3 font-medium text-neutral-500">Tipe</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-center">User</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-center">Cabang</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-right">Harga/Bulan</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-center">Fitur</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-center">Status</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900">
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900 dark:text-neutral-50">{pkg.label}</p>
                    <p className="text-xs text-neutral-400">{pkg.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      pkg.is_custom ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400" : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                    }`}>
                      {pkg.is_custom ? "Custom" : "Standar"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">{pkg.max_users}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{pkg.max_branches}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatRupiah(pkg.monthly_price)}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{featureCount(pkg)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex h-2 w-2 rounded-full ${pkg.is_active ? "bg-green-500" : "bg-neutral-300"}`} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/platform/packages/${pkg.id}/edit`}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      {pkg.is_custom && (
                        <button
                          onClick={() => handleDelete(pkg)}
                          disabled={deletingId === pkg.id}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
