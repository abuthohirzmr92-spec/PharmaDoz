"use client";

import { useState, useMemo } from "react";
import { Search, Shield, Clock } from "lucide-react";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { Pagination } from "@/components/subscription/pagination";
import { superAdminRepo } from "@/lib/repository-instances";
import { AppBadge } from "@/components/ui/app-badge";

const fmt = (iso: string | null | undefined) =>
  iso && !Number.isNaN(Date.parse(iso))
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

const ACTION_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "subscription", label: "Langganan" },
  { key: "tenant", label: "Tenant" },
  { key: "user", label: "User" },
  { key: "payment", label: "Pembayaran" },
  { key: "other", label: "Lainnya" },
];

function actionCategory(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("subscript") || a.includes("suspend") || a.includes("cancel") || a.includes("reactivate") || a.includes("trial") || a.includes("renew")) return "subscription";
  if (a.includes("tenant") || a.includes("create") || a.includes("delete") || a.includes("update")) return "tenant";
  if (a.includes("user") || a.includes("auth") || a.includes("login") || a.includes("role")) return "user";
  if (a.includes("pay") || a.includes("invoice") || a.includes("bill")) return "payment";
  return "other";
}

const PAGE_SIZE = 15;

export default function AuditPage() {
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, loading, error } = useAsync(async () => {
    const logs = await superAdminRepo.getActivityLogs(100);
    return (logs ?? []).map((log: any) => ({
      id: log.id,
      actorId: log.actorId ?? "system",
      action: log.action ?? "—",
      resourceType: log.resourceType ?? "—",
      resourceId: log.resourceId ?? "—",
      tenantId: log.tenantId ?? null,
      createdAt: log.createdAt ?? null,
      metadata: log.metadata ?? {},
    }));
  }, []);

  const logs = data ?? [];

  const filtered = useMemo(() => {
    let r = logs;
    if (actionFilter !== "all") r = r.filter((l: any) => actionCategory(l.action) === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((l: any) =>
        l.action.toLowerCase().includes(q) ||
        l.resourceType.toLowerCase().includes(q) ||
        (l.metadata?.correlation_id && String(l.metadata.correlation_id).toLowerCase().includes(q))
      );
    }
    return r;
  }, [logs, actionFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Summary
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of logs) {
      const cat = actionCategory(l.action);
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return map;
  }, [logs]);

  return (
    <div className="space-y-4">
      {/* ── Summary pills ── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {["subscription", "tenant", "user", "payment", "other"].map((cat) => (
          <button
            key={cat}
            onClick={() => { setActionFilter(cat === actionFilter ? "all" : cat); setPage(0); }}
            className={`rounded-xl border p-3 text-center transition-all ${
              actionFilter === cat
                ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-950/30"
                : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-800/50"
            }`}
          >
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50 tabular-nums">
              {categories.get(cat) ?? 0}
            </p>
            <p className="text-[10px] capitalize text-neutral-400">{cat}</p>
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {ACTION_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setActionFilter(f.key); setPage(0); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                actionFilter === f.key
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
            placeholder="Cari aksi atau correlation ID..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder-neutral-500 sm:w-64"
          />
        </div>
      </div>

      {/* ── Audit Table ── */}
      <WidgetShell title={`Log Aktivitas (${filtered.length})`} loading={loading} error={error} isEmpty={logs.length === 0} emptyText="Belum ada log aktivitas.">
        {logs.length > 0 && filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">Tidak ada log yang cocok dengan filter &quot;{actionFilter}&quot;.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="py-2 pr-3 font-medium text-neutral-500">Aksi</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Kategori</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Resource</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Actor</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Tenant</th>
                    <th className="py-2 pl-2 font-medium text-neutral-500">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((log: any, i: number) => {
                    const cat = actionCategory(log.action);
                    const catTone =
                      cat === "subscription" ? "info"
                      : cat === "payment" ? "success"
                      : cat === "user" ? "warning"
                      : cat === "tenant" ? "info"
                      : "neutral";

                    return (
                      <tr key={log.id ?? i} className="border-b border-neutral-100 dark:border-neutral-800/50">
                        <td className="py-2 pr-3">
                          <span className="font-medium text-neutral-900 dark:text-neutral-50">{log.action}</span>
                          {log.metadata?.correlation_id && (
                            <><br /><span className="text-[10px] font-mono text-neutral-400">{String(log.metadata.correlation_id).slice(0, 20)}</span></>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <AppBadge variant={catTone}>{cat}</AppBadge>
                        </td>
                        <td className="py-2 px-2 text-neutral-500 text-xs">
                          {log.resourceType} · {String(log.resourceId).slice(0, 8)}
                        </td>
                        <td className="py-2 px-2 text-xs text-neutral-400 font-mono">{String(log.actorId).slice(0, 8)}</td>
                        <td className="py-2 px-2 text-xs text-neutral-400 font-mono">{log.tenantId ? String(log.tenantId).slice(0, 8) : "—"}</td>
                        <td className="py-2 pl-2 text-xs text-neutral-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {fmt(log.createdAt)}
                          </span>
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

      {/* ── Info panels ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WidgetShell title="Event Ledger (Langganan)" loading={false} error={null}>
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 shrink-0 text-brand-500" />
            <div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">subscription_events</code> adalah immutable audit trail.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Setiap transisi lifecycle tercatat dengan correlation_id, actor, before/after state. Dapat di-query per tenant dari halaman Tenant Detail → Timeline.
              </p>
            </div>
          </div>
        </WidgetShell>
        <WidgetShell title="Pelacakan Korelasi" loading={false} error={null}>
          <div className="flex items-start gap-2">
            <Search className="h-5 w-5 shrink-0 text-brand-500" />
            <div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                Setiap transisi + payment + scheduler run memiliki correlationId.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Hubungan antara sumber event (manual/scheduler/webhook) ke subscription_events dilacak via correlation_id. Gunakan pencarian di atas untuk mencari correlation ID spesifik.
              </p>
            </div>
          </div>
        </WidgetShell>
      </div>
    </div>
  );
}
