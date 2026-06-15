"use client";

import { Sparkles, PiggyBank, User, Building2 } from "lucide-react";

/**
 * Profit Allocation — Coming Soon placeholder.
 *
 * This card is a roadmap preview. The actual feature will:
 *   - Calculate net profit from revenue, HPP, and expenses
 *   - Apply configurable percentage splits (cadangan, pemilik)
 *   - Snapshot allocations during "Tutup Buku" monthly close
 *
 * Not yet implemented — no database tables, no store, no calculations.
 */
export function ProfitAllocationCard() {
  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-6 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Profit Allocation
              </h3>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                Coming Soon
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Alokasi profit bersih ke cadangan, pemilik, dan operasional.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-amber-200 bg-white/80 p-3 dark:border-amber-800 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Cadangan</span>
          </div>
          <p className="mt-2 text-lg font-bold text-neutral-300 dark:text-neutral-700">—%</p>
          <p className="text-[10px] text-neutral-400">Dari profit bersih</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-white/80 p-3 dark:border-amber-800 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Pemilik</span>
          </div>
          <p className="mt-2 text-lg font-bold text-neutral-300 dark:text-neutral-700">—%</p>
          <p className="text-[10px] text-neutral-400">Dari profit bersih</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-white/80 p-3 dark:border-amber-800 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Operasional</span>
          </div>
          <p className="mt-2 text-lg font-bold text-neutral-300 dark:text-neutral-700">—</p>
          <p className="text-[10px] text-neutral-400">Sisa profit bersih</p>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-amber-600/70 dark:text-amber-400/60">
        Fitur ini akan tersedia setelah launch. Termasuk: konfigurasi persentase, tutup buku bulanan, dan snapshot profit.
      </p>
    </div>
  );
}
