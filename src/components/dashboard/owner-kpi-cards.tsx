"use client";

import { useOwnerMetrics, type MetricFilter } from "@/hooks/use-owner-metrics";
import { cn } from "@/lib/cn";
import { DollarSign, TrendingUp, ShoppingCart, Wallet, Banknote, Landmark, Package, AlertTriangle, Clock, Skull, Bell, ArrowDown, ArrowUp } from "lucide-react";

function formatRupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: any; color: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4 bg-white dark:bg-neutral-950", color)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-neutral-500">{label}</span>
        <Icon className="h-4 w-4 text-neutral-400" />
      </div>
      <p className="mt-2 text-lg font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-neutral-400">{sub}</p>}
    </div>
  );
}

interface Props {
  filter: MetricFilter;
  branchId?: string;
}

export function OwnerKpiCards({ filter, branchId }: Props) {
  const m = useOwnerMetrics(filter, branchId);

  return (
    <div className="space-y-4">
      {/* Financial KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Revenue" value={formatRupiah(m.revenue)} sub={`${m.transactionCount} transaksi`} icon={DollarSign} color="border-blue-200 dark:border-blue-800" />
        <KpiCard label="Profit" value={formatRupiah(m.profit)} sub={m.revenue > 0 ? `Margin ${Math.round((m.profit/m.revenue)*100)}%` : ""} icon={TrendingUp} color={m.profit >= 0 ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"} />
        <KpiCard label="Cash" value={formatRupiah(m.cashBalance)} icon={Banknote} color="border-green-200 dark:border-green-800" />
        <KpiCard label="Bank" value={formatRupiah(m.bankBalance)} icon={Landmark} color="border-blue-200 dark:border-blue-800" />
        <KpiCard label="Total Dana" value={formatRupiah(m.totalFunds)} icon={Wallet} color="border-purple-200 dark:border-purple-800" />
        <KpiCard label="Inventory Value" value={formatRupiah(m.inventoryValue)} icon={Package} color="border-amber-200 dark:border-amber-800" />
      </div>

      {/* Inventory Health */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Near Expiry", value: `${m.nearExpiryCount} produk`, sub: formatRupiah(m.nearExpiryValue), icon: Clock, color: "border-amber-200 dark:border-amber-800" },
          { label: "At-Risk", value: `${m.atRiskCount} produk`, sub: formatRupiah(m.atRiskValue), icon: AlertTriangle, color: "border-red-200 dark:border-red-800" },
          { label: "Dead Stock", value: `${m.deadStockCount} produk`, sub: formatRupiah(m.deadStockValue), icon: Skull, color: "border-neutral-300 dark:border-neutral-700" },
          { label: "Reorder Needed", value: `${m.reorderNeededCount} produk`, sub: "Stok di bawah minimum", icon: Bell, color: "border-blue-200 dark:border-blue-800" },
        ].map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      {/* Top Products */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <h3 className="mb-2 text-xs font-semibold text-neutral-500">🏆 Top Selling</h3>
          {m.topSelling.length === 0 ? <EmptyMsg text="Belum ada penjualan di periode ini" /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="py-1 text-left text-neutral-400">Produk</th>
                <th className="py-1 text-right text-neutral-400">Qty</th>
                <th className="py-1 text-right text-neutral-400">Revenue</th>
              </tr></thead>
              <tbody>
                {m.topSelling.map((p, i) => (
                  <tr key={i}><td className="py-1">{p.name}</td><td className="py-1 text-right">{p.qty}</td><td className="py-1 text-right">{formatRupiah(p.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <h3 className="mb-2 text-xs font-semibold text-neutral-500">💰 Most Profitable</h3>
          {m.topProfitable.length === 0 ? <EmptyMsg text="Belum ada data profit" /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="py-1 text-left text-neutral-400">Produk</th>
                <th className="py-1 text-right text-neutral-400">Profit</th>
                <th className="py-1 text-right text-neutral-400">M%</th>
              </tr></thead>
              <tbody>
                {m.topProfitable.map((p, i) => (
                  <tr key={i}><td className="py-1">{p.name}</td><td className="py-1 text-right">{formatRupiah(p.profit)}</td><td className="py-1 text-right text-green-600 font-medium">{p.margin}%</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Alerts */}
      {m.alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
            <Bell className="h-3.5 w-3.5" /> Actionable Insights
          </h3>
          <div className="space-y-1.5">
            {m.alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300">
                {a.type === "expiry" && <Clock className="mt-0.5 h-3 w-3 shrink-0" />}
                {a.type === "reorder" && <Bell className="mt-0.5 h-3 w-3 shrink-0" />}
                {a.type === "slow" && <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />}
                {a.type === "dead" && <Skull className="mt-0.5 h-3 w-3 shrink-0" />}
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return <p className="py-4 text-center text-xs text-neutral-400">{text}</p>;
}
