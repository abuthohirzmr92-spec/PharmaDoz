"use client";

import { useMemo } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { cn } from "@/lib/cn";
import { Wallet, Shield, TrendingUp, User } from "lucide-react";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
}

interface CatConfig {
  label: string; icon: typeof Wallet; color: string;
}

const CATEGORIES: Record<string, CatConfig> = {
  operasional: { label: "Operasional", icon: Wallet, color: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
  cadangan:    { label: "Cadangan",   icon: Shield, color: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400" },
  pengembangan: { label: "Pengembangan", icon: TrendingUp, color: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400" },
  pemilik:     { label: "Pemilik",    icon: User, color: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" },
};

export function FundCategoryCards() {
  const wallets = useWalletStore((s) => s.wallets);
  const active = useMemo(
    () => wallets.filter((w) => !w.isArchived && w.isActive),
    [wallets],
  );

  const total = useMemo(() => active.reduce((s, w) => s + w.balance, 0), [active]);

  const groups = useMemo(() => {
    const map: Record<string, { total: number; wallets: typeof active }> = {};
    for (const w of active) {
      const cat = ((w.settings as any)?.category as string) ?? "operasional";
      if (!map[cat]) map[cat] = { total: 0, wallets: [] };
      map[cat].total += w.balance;
      map[cat].wallets.push(w);
    }
    return map;
  }, [active]);

  if (active.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Alokasi Dana</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-xs text-neutral-500">Total Dana</p>
          <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-50">{formatRupiah(total)}</p>
        </div>
        {Object.entries(CATEGORIES).map(([key, cfg]) => {
          const grp = groups[key];
          const Icon = cfg.icon;
          return (
            <div key={key} className={cn("rounded-xl border p-4 bg-white dark:bg-neutral-950",
              grp ? "border-neutral-200 dark:border-neutral-800" : "border-neutral-100 dark:border-neutral-800 opacity-40")}>
              <div className="flex items-center gap-2">
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", cfg.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-medium text-neutral-500">{cfg.label}</span>
              </div>
              <p className="mt-2 text-sm font-bold text-neutral-900 dark:text-neutral-50">
                {grp ? formatRupiah(grp.total) : "Rp 0"}
              </p>
              {grp && <p className="text-[10px] text-neutral-400">{grp.wallets.length} wallet</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
