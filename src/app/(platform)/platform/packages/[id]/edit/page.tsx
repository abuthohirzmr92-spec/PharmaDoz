"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { usePackageStore } from "@/store/package-store";
import { useAuthStore } from "@/store/auth-store";
import { isSystemRole } from "@/lib/auth/permissions";
import { ALL_FEATURE_KEYS, FEATURE_LABELS, FEATURE_DESCRIPTIONS } from "@/lib/features/registry";
import { Shield, ChevronLeft, Loader2 } from "lucide-react";

export default function EditPackagePage() {
  const router = useRouter();
  const params = useParams();
  const pkgId = params.id as string;
  const { user } = useAuthStore();
  const { packages, loadPackages, updatePackage, isLoading } = usePackageStore();

  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [maxUsers, setMaxUsers] = useState(5);
  const [maxBranches, setMaxBranches] = useState(1);
  const [maxProducts, setMaxProducts] = useState(200);
  const [monthlyPrice, setMonthlyPrice] = useState(0);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (packages.length === 0) loadPackages().then(() => setLoaded(true));
    else setLoaded(true);
  }, []);

  useEffect(() => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (pkg) {
      setName(pkg.name);
      setLabel(pkg.label);
      setMaxUsers(pkg.maxUsers);
      setMaxBranches(pkg.maxBranches);
      setMaxProducts(pkg.maxProducts);
      setMonthlyPrice(pkg.monthlyPrice);
      setFeatures(pkg.featureFlags ?? {});
    }
  }, [packages, pkgId]);

  if (!user || !isSystemRole(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-8 w-8 text-neutral-400 mb-3" />
        <h2 className="text-sm font-semibold text-neutral-700">Akses Ditolak</h2>
      </div>
    );
  }

  const pkg = packages.find((p) => p.id === pkgId);

  if (loaded && !pkg) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-neutral-500">Paket tidak ditemukan.</p>
        <Link href="/platform/packages" className="mt-3 text-sm text-brand-600 hover:text-brand-700">Kembali ke daftar paket</Link>
      </div>
    );
  }

  const toggleFeature = (key: string) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !label.trim()) { setError("Nama dan label wajib diisi."); return; }

    await updatePackage(pkgId, {
      name: name.trim().toLowerCase().replace(/\s+/g, "_"),
      label: label.trim(),
      maxUsers,
      maxBranches,
      maxProducts,
      monthlyPrice,
      featureFlags: features,
    });

    router.push("/platform/packages");
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/platform/packages" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-3">
          <ChevronLeft className="h-4 w-4" />Kembali ke Paket
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Edit Paket</h1>
        <p className="mt-1 text-sm text-neutral-500">{pkg?.label ?? "Memuat..."}</p>
      </div>

      {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <fieldset disabled={isLoading} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nama (slug)</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Label</label>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Max User</label>
              <input type="number" value={maxUsers} onChange={(e) => setMaxUsers(Number(e.target.value))} min={1}
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Max Cabang</label>
              <input type="number" value={maxBranches} onChange={(e) => setMaxBranches(Number(e.target.value))} min={1}
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Max Produk</label>
              <input type="number" value={maxProducts} onChange={(e) => setMaxProducts(Number(e.target.value))} min={50}
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Harga per Bulan (Rp)</label>
            <input type="number" value={monthlyPrice} onChange={(e) => setMonthlyPrice(Number(e.target.value))} min={0}
              className="mt-1 block w-full max-w-[200px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Fitur Premium ({Object.values(features).filter(Boolean).length}/{ALL_FEATURE_KEYS.length} aktif)
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {ALL_FEATURE_KEYS.map((key) => (
                <label key={key} className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 cursor-pointer">
                  <input type="checkbox" checked={features[key] ?? false} onChange={() => toggleFeature(key)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{FEATURE_LABELS[key] ?? key}</p>
                    <p className="text-xs text-neutral-400">{FEATURE_DESCRIPTIONS[key]?.slice(0, 60) ?? ""}…</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <button type="submit" disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
