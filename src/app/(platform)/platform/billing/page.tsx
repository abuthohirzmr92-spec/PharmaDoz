"use client";

import { useState, useMemo } from "react";
import { Search, AlertTriangle, DollarSign, Clock, CreditCard } from "lucide-react";
import { AppBadge } from "@/components/ui/app-badge";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { Pagination } from "@/components/subscription/pagination";
import { dashboardService } from "@/lib/services/dashboard-service";
import { daysAgo, agingLabel, invoiceStatusTone, computeAgingBuckets } from "@/lib/subscription/billing-viewmodel";
import type { BillingOverview } from "@/types/subscription-dtos";

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const fmt = (iso: string | null | undefined) =>
  iso && !Number.isNaN(Date.parse(iso))
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const STATUS_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "overdue", label: "Overdue" },
  { key: "sent", label: "Tertunggak" },
  { key: "draft", label: "Draft" },
  { key: "paid", label: "Lunas" },
  { key: "canceled", label: "Dibatalkan" },
];

const PAGE_SIZE = 10;

export default function BillingMonitorPage() {
  const { data, loading, error } = useAsync<BillingOverview>(
    () => dashboardService.getBillingOverview(),
    [],
  );

  const summary = data;
  const allInvoices = data?.invoices ?? [];

  // ── Filters ──
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let r = allInvoices;
    if (statusFilter !== "all") r = r.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((i) => i.tenantName.toLowerCase().includes(q) || i.invoiceNumber.toLowerCase().includes(q));
    }
    return r.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }, [allInvoices, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* ── Summary Cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={DollarSign} label="Estimasi MRR" value={rupiah(summary?.estimatedMRR ?? 0)} tone="info" />
        <SummaryCard icon={AlertTriangle} label="Total Tertunggak" value={rupiah(summary?.totalOutstanding ?? 0)} tone={summary?.overdueCount ? "danger" : "warning"} />
        <SummaryCard icon={Clock} label="Invoice Overdue" value={`${summary?.overdueCount ?? 0} (${rupiah(summary?.overdueAmount ?? 0)})`} tone={summary?.overdueCount ? "danger" : "success"} />
        <SummaryCard icon={CreditCard} label="Dibayar Bulan Ini" value={rupiah(summary?.paidThisMonth ?? 0)} tone="success" />
      </div>

      {/* ── Aging Summary ── */}
      <WidgetShell title="Aging Penagihan" loading={loading} error={error}>
        {allInvoices.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada data invoice. Aging akan tersedia setelah invoice dibuat di staging.</p>
        ) : (
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {computeAgingBuckets(allInvoices).map((bucket) => (
              <div key={bucket.label} className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-400">{bucket.label}</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">{bucket.count}</p>
                <p className="text-[10px] text-neutral-400">{rupiah(bucket.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </WidgetShell>

      {/* ── Invoice Table ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(0); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === f.key
                  ? "border-brand-200 bg-white text-brand-700 shadow-sm dark:border-brand-800 dark:bg-neutral-800 dark:text-brand-300"
                  : "border border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Cari invoice atau apotek..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder-neutral-500 sm:w-64"
          />
        </div>
      </div>

      <WidgetShell title={`Invoice (${filtered.length})`} loading={loading} error={error} isEmpty={allInvoices.length === 0} emptyText="Belum ada invoice. Data akan muncul setelah billing berjalan di staging.">
        {allInvoices.length > 0 && filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">Tidak ada invoice yang cocok dengan filter.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="py-2 pr-3 font-medium text-neutral-500">Invoice #</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Apotek</th>
                    <th className="py-2 px-2 font-medium text-neutral-500 text-right">Jumlah</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Status</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Aging</th>
                    <th className="py-2 pl-2 font-medium text-neutral-500">Jatuh Tempo</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((inv) => {
                    const dueDays = daysAgo(inv.dueDate);
                    const aging = dueDays !== null ? agingLabel(dueDays) : null;
                    return (
                      <tr key={inv.id} className="border-b border-neutral-100 dark:border-neutral-800/50">
                        <td className="py-2 pr-3 font-mono text-xs text-neutral-900 dark:text-neutral-50">{inv.invoiceNumber}</td>
                        <td className="py-2 px-2">
                          <span className="text-neutral-900 dark:text-neutral-50">{inv.tenantName}</span>
                          <br /><span className="text-xs text-neutral-400">{inv.tenantId?.slice(0, 8)}</span>
                        </td>
                        <td className="py-2 px-2 text-right font-medium tabular-nums">{rupiah(inv.amount)}</td>
                        <td className="py-2 px-2"><AppBadge variant={invoiceStatusTone(inv.status)}>{inv.status}</AppBadge></td>
                        <td className="py-2 px-2">
                          {aging ? <AppBadge variant={aging.tone}>{aging.label}</AppBadge> : <span className="text-xs text-neutral-400">—</span>}
                        </td>
                        <td className="py-2 pl-2 text-xs text-neutral-400">
                          {inv.paidAt ? <span className="text-green-600 dark:text-green-400">Lunas {fmt(inv.paidAt)}</span> : fmt(inv.dueDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination page={page} totalPages={totalPages} totalResults={filtered.length} onPageChange={setPage} />
          </>
        )}
      </WidgetShell>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone === "danger" ? "text-red-500" : tone === "warning" ? "text-amber-500" : tone === "success" ? "text-green-500" : "text-brand-500"}`} />
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className={`mt-1 text-lg font-bold tabular-nums ${tone === "danger" ? "text-red-700 dark:text-red-400" : tone === "warning" ? "text-amber-700 dark:text-amber-400" : "text-neutral-900 dark:text-neutral-50"}`}>
        {value}
      </p>
    </div>
  );
}
