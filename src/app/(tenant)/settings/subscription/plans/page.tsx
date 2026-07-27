"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { AppBadge } from "@/components/ui/app-badge";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { packageRepo, subscriptionRepo, quotaRepo } from "@/lib/repository-instances";
import { ALL_FEATURE_KEYS, FEATURE_LABELS } from "@/lib/features/registry";
import { buildComparisonMatrix, recommendUpgrade, type PackageLite } from "@/lib/subscription/plan-compare";
import { packagePresentation } from "@/config/package-presentation";

const rupiah = (n: number) => (n > 0 ? `Rp ${Math.round(n).toLocaleString("id-ID")}` : "Gratis");

interface PlansData {
  packages: PackageLite[];
  currentPackageId: string | null;
  recommendedId: string | null;
}

export default function SubscriptionPlansPage() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);

  const { data, loading, error } = useAsync<PlansData>(async () => {
    if (!tenantId) return { packages: [], currentPackageId: null, recommendedId: null };
    const [rows, sub, usage] = await Promise.all([
      packageRepo.getAllPackages(),
      subscriptionRepo.getCurrent(tenantId),
      quotaRepo.listUsage(tenantId),
    ]);
    const active = rows.filter((p) => p.isActive);
    const packages: PackageLite[] = await Promise.all(
      active.map(async (p) => {
        const feats = await packageRepo.getPackageFeatures(p.id);
        const features: Record<string, boolean> = {};
        for (const f of feats) features[f.featureKey] = f.isEnabled;
        return {
          id: p.id, name: p.name, label: p.label, monthlyPrice: p.monthlyPrice,
          maxUsers: p.maxUsers, maxBranches: p.maxBranches, maxProducts: p.maxProducts, features,
        };
      }),
    );
    const currentPackageId = sub?.packageId ?? null;
    const currentPrice = packages.find((p) => p.id === currentPackageId)?.monthlyPrice ?? 0;
    const recommendedId = recommendUpgrade(currentPrice, usage.map((u) => ({ resource: u.resource, current: u.current, max: u.max })), packages);
    return { packages, currentPackageId, recommendedId };
  }, [tenantId]);

  const packages = data?.packages ?? [];
  const matrix = buildComparisonMatrix([...ALL_FEATURE_KEYS], FEATURE_LABELS, packages);

  return (
    <div className="space-y-4">
      {data?.recommendedId && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/30">
          <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
            Penggunaan Anda mendekati batas paket. Paket lebih tinggi direkomendasikan.
          </p>
          <Link href="/settings/subscription/upgrade" className="mt-2 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Lihat Opsi Upgrade
          </Link>
        </div>
      )}

      {/* Value cards — "why upgrade?" (Add-ons are a separate concept, not shown here) */}
      {packages.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => {
            const pres = packagePresentation(p.name);
            const isCurrent = p.id === data?.currentPackageId;
            return (
              <div
                key={p.id}
                className={
                  "relative rounded-2xl border p-4 " +
                  (isCurrent
                    ? "border-brand-300 bg-brand-50/40 dark:border-brand-700 dark:bg-brand-950/20"
                    : "border-neutral-200 dark:border-neutral-800")
                }
              >
                {pres.badge && (
                  <span className="absolute -top-2 right-3">
                    <AppBadge variant="info">{pres.badge === "popular" ? "Paling Populer" : "Nilai Terbaik"}</AppBadge>
                  </span>
                )}
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{p.label}</h3>
                <p className="text-xs text-neutral-500">{pres.recommendedFor}</p>
                <p className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-50">{rupiah(p.monthlyPrice)}<span className="text-xs font-normal text-neutral-400">/bln</span></p>
                <ul className="mt-3 space-y-1 text-sm">
                  {pres.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                      <span className="text-green-600" aria-hidden>✔</span>{h}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <AppBadge variant="success">Paket Anda</AppBadge>
                  ) : (
                    <Link href={`/settings/subscription/upgrade?to=${p.id}`} className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                      Pilih Paket
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <WidgetShell title="Perbandingan Paket" loading={loading} error={error} isEmpty={packages.length === 0} emptyText="Belum ada paket tersedia.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-3 font-medium text-neutral-500">Fitur / Batas</th>
                {packages.map((p) => (
                  <th key={p.id} className="px-3 py-2 text-center">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-50">{p.label}</div>
                    {p.id === data?.currentPackageId && <AppBadge variant="success">Paket Anda</AppBadge>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <ResourceRow label="Pengguna" values={packages.map((p) => p.maxUsers)} />
              <ResourceRow label="Cabang" values={packages.map((p) => p.maxBranches)} />
              <ResourceRow label="Produk" values={packages.map((p) => p.maxProducts)} />
              {matrix.map((row) => (
                <tr key={row.featureKey} className="border-b border-neutral-100 dark:border-neutral-800/50">
                  <td className="py-2 pr-3 text-neutral-600 dark:text-neutral-400">{row.label}</td>
                  {row.cells.map((c) => (
                    <td key={c.packageId} className="px-3 py-2 text-center">
                      {c.enabled ? <span className="text-green-600" aria-label="tersedia">✓</span> : <span className="text-neutral-300" aria-label="tidak tersedia">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="py-2 pr-3 font-medium text-neutral-700 dark:text-neutral-300">Harga / bulan</td>
                {packages.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-center font-semibold text-neutral-900 dark:text-neutral-50">{rupiah(p.monthlyPrice)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3" />
                {packages.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-center">
                    {p.id === data?.currentPackageId ? (
                      <span className="text-xs text-neutral-400">Aktif</span>
                    ) : (
                      <Link href={`/settings/subscription/upgrade?to=${p.id}`} className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-300">
                        Pilih
                      </Link>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </WidgetShell>
    </div>
  );
}

function ResourceRow({ label, values }: { label: string; values: number[] }) {
  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800/50">
      <td className="py-2 pr-3 text-neutral-600 dark:text-neutral-400">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2 text-center text-neutral-900 dark:text-neutral-50">{v}</td>
      ))}
    </tr>
  );
}
