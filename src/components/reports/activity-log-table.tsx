"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { activityLogRepo } from "@/lib/repository-instances";
import { ExportBar } from "./export-bar";
import { exportTableToPdf } from "@/lib/export-pdf";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import type { ActivityLogEntry } from "@/lib/repositories/activity-log";

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  critical: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const ACTION_LABELS: Record<string, string> = {
  "sale.created": "Sale", "purchase.created": "Purchase", "purchase.payment": "Payment",
  "return.created": "Return", "return.refunded": "Refund", "opname.created": "Opname",
  "product.created": "Product+", "product.updated": "Product~", "product.deleted": "Product-",
  "wallet.transfer": "Transfer", "wallet.deposit": "Deposit", "wallet.withdrawal": "Withdraw",
};

const ACTIONS = ["", "sale.created", "purchase.created", "return.created", "opname.created", "wallet.transfer"];
const SEVERITIES = ["", "info", "warning", "critical"];

// TODO: branch isolation pending schema support — activity_logs has no pharmacy_id column
export function ActivityLogTable({ branchId: _branchId = "all" }: { branchId?: string }) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const limit = 30;

  const load = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const { data, count } = await activityLogRepo.getLogs({
        action: actionFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo ? dateTo + "T23:59:59" : undefined,
        page: p, limit,
      });
      setLogs(data);
      setTotalCount(count ?? 0);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [actionFilter, dateFrom, dateTo]);

  useEffect(() => { load(page); }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const handleExport = async (format: "pdf" | "excel") => {
    setIsExporting(true);
    try {
      if (format === "pdf" && tableRef.current) await exportTableToPdf(tableRef.current, "Log Aktivitas");
      toast.success(`${format.toUpperCase()} berhasil`);
    } catch (e: any) { toast.error(e?.message ?? "Gagal ekspor"); }
    finally { setIsExporting(false); }
  };

  return (
    <div ref={tableRef}>
      {/* Filters + Export */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <ExportBar onExport={handleExport} isExporting={isExporting} />
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50">
          {ACTIONS.map((a) => <option key={a} value={a}>{a ? ACTION_LABELS[a] ?? a : "Semua Tipe"}</option>)}
        </select>
        <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50">
          {SEVERITIES.map((s) => <option key={s} value={s}>{s || "Semua Severity"}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
        <span className="text-xs text-neutral-400">s/d</span>
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[14%] px-3 py-2 text-left text-[11px] font-semibold text-neutral-500">Date</th>
              <th className="w-[12%] px-3 py-2 text-left text-[11px] font-semibold text-neutral-500">User</th>
              <th className="w-[8%] px-3 py-2 text-left text-[11px] font-semibold text-neutral-500">Sev</th>
              <th className="w-[11%] px-3 py-2 text-left text-[11px] font-semibold text-neutral-500">Action</th>
              <th className="w-[13%] px-3 py-2 text-left text-[11px] font-semibold text-neutral-500">Ref</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-neutral-500">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-neutral-400">Memuat...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-neutral-400">Belum ada aktivitas</td></tr>
            ) : logs.map((log) => {
              const meta = log.metadata ?? {};
              const ref = (meta.reference as string) ?? log.resourceId?.slice(0, 8) ?? "—";
              const severity = (meta.severity as string) ?? "info";
              const summary = buildSummary(log.action, meta);
              return (
                <tr key={log.id} className="group">
                  <td className="px-3 py-2 text-xs text-neutral-500">{formatDate(log.createdAt)}</td>
                  <td className="px-3 py-2 text-xs text-neutral-600">{log.actorId.slice(0, 8)}</td>
                  <td className="px-3 py-2"><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.info)}>{severity}</span></td>
                  <td className="px-3 py-2 text-xs text-neutral-600">{ACTION_LABELS[log.action] ?? log.action}</td>
                  <td className="px-3 py-2 text-xs font-mono text-neutral-500">{ref}</td>
                  <td className="px-3 py-2 text-xs text-neutral-600">{summary}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
        <span>{totalCount} entri · Halaman {page}/{totalPages}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded border px-2 py-1 disabled:opacity-30">← Prev</button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="rounded border px-2 py-1 disabled:opacity-30">Next →</button>
        </div>
      </div>
    </div>
  );
}

function buildSummary(action: string, meta: Record<string, unknown>): string {
  switch (action) {
    case "sale.created": return `Checkout ${meta.itemCount ?? "?"} items · Rp ${(meta.total as number)?.toLocaleString("id-ID") ?? "?"} · ${meta.paymentMethod ?? "?"}`;
    case "purchase.created": return `Invoice ${meta.supplierName ?? "?"} · ${meta.itemCount ?? "?"} items · Rp ${(meta.totalAmount as number)?.toLocaleString("id-ID") ?? "?"}`;
    case "return.created": return `Retur ${meta.originalInvoice ?? "?"} · Rp ${(meta.refundAmount as number)?.toLocaleString("id-ID") ?? "?"}`;
    case "opname.created": return `${meta.itemCount ?? "?"} items · ${meta.diffCount ?? "?"} selisih`;
    case "wallet.transfer": return `${meta.fromWallet ?? "?"} → ${meta.toWallet ?? "?"} · Rp ${(meta.amount as number)?.toLocaleString("id-ID") ?? "?"}`;
    default: return JSON.stringify(meta).slice(0, 80);
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
