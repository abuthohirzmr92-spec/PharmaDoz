"use client";

import { useState, useMemo } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { AppBadge } from "@/components/ui/app-badge";
import { AppCard } from "@/components/ui/app-card";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useRefreshable } from "@/components/subscription/use-refreshable";
import { Pagination } from "@/components/subscription/pagination";
import { superAdminRepo, subscriptionRepo } from "@/lib/repository-instances";
import { buildSubscriptionTableRows, lifecycleStateTone } from "@/lib/subscription/subscription-list-viewmodel";
import { suspendSubscription, reactivateSubscription, cancelSubscription } from "./actions";

const LIFECYCLE_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "trial_active", label: "Trial" },
  { key: "grace_period", label: "Grace" },
  { key: "suspended", label: "Suspended" },
  { key: "expired", label: "Expired" },
  { key: "terminated", label: "Terminated" },
];

const PAGE_SIZE = 10;

export default function SubscriptionsPage() {
  const userId = useAuthStore((s) => s.user?.id ?? "admin");

  const { data, loading, error, refresh } = useRefreshable(async () => {
    const tenants = await superAdminRepo.getAllTenants();
    const tenantIds = tenants.map((t) => t.pharmacyId as unknown as string);

    // Single batch query — replaces N per-tenant queries.
    const subs = tenantIds.length > 0
      ? await subscriptionRepo.listByTenants(tenantIds).catch(() => [] as any[])
      : [];
    const subMap = new Map<string, { lifecycleState: string | null; id: string; tenantId: string }>();
    for (const sub of subs) {
      if (sub && sub.tenantId) {
        subMap.set(sub.tenantId, { lifecycleState: sub.lifecycleState, id: sub.id, tenantId: sub.tenantId });
      }
    }

    const rawRows = tenants.map((t) => ({
      tenantId: t.pharmacyId as unknown as string,
      tenantName: t.pharmacyName,
      packageName: t.packageName,
      isActive: t.isActive,
      lifecycleState: (subMap.get(t.pharmacyId as unknown as string)?.lifecycleState) ?? null,
      subscriptionId: (subMap.get(t.pharmacyId as unknown as string)?.id) ?? null,
    }));
    return buildSubscriptionTableRows(rawRows);
  });

  const rows = data ?? [];

  // ── Filters & Search ──
  const [lifecycleFilter, setLifecycleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let r = rows;
    if (lifecycleFilter !== "all") r = r.filter((x) => (x.lifecycleState ?? "—") === lifecycleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((x) => x.tenantName.toLowerCase().includes(q));
    }
    return r;
  }, [rows, lifecycleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const applyFilter = (v: string) => { setLifecycleFilter(v); setPage(0); };

  // ── Lifecycle action confirmation state ──
  const [confirmAction, setConfirmAction] = useState<{
    subId: string;
    tenantName: string;
    action: "suspend" | "reactivate" | "cancel";
  } | null>(null);

  const executeAction = async () => {
    if (!confirmAction) return;
    const { subId, tenantName, action } = confirmAction;
    let res: { ok: boolean; error?: string };
    try {
      if (action === "suspend") res = await suspendSubscription(subId, userId);
      else if (action === "reactivate") res = await reactivateSubscription(subId, userId);
      else res = await cancelSubscription(subId, userId);

      if (res.ok) {
        toast.success(`Langganan "${tenantName}" berhasil di-${action === "suspend" ? "suspend" : action === "reactivate" ? "aktifkan kembali" : "batalkan"}.`);
      } else {
        toast.error(res.error ?? "Gagal");
      }
    } catch {
      toast.error("Terjadi kesalahan tak terduga.");
    }
    setConfirmAction(null);
    refresh();
  };

  return (
    <div className="space-y-4">
      {/* ── Confirmation dialog ── */}
      {confirmAction && (
        <AppCard variant="elevated">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                <AlertTriangle className="mr-1 inline h-4 w-4 text-amber-500" />
                Konfirmasi {confirmAction.action === "suspend" ? "Suspend" : confirmAction.action === "reactivate" ? "Aktivasi Ulang" : "Pembatalan"}
              </h3>
              <button onClick={() => setConfirmAction(null)} className="text-neutral-400 hover:text-neutral-600">✕</button>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {confirmAction.action === "suspend"
                ? `Anda akan men-suspend langganan "${confirmAction.tenantName}". Tenant tidak dapat mengakses layanan sampai diaktifkan kembali.`
                : confirmAction.action === "reactivate"
                ? `Anda akan mengaktifkan kembali langganan "${confirmAction.tenantName}".`
                : `Anda akan membatalkan langganan "${confirmAction.tenantName}" secara permanen. Tindakan ini tidak dapat dibatalkan.`}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400">Batal</button>
              <button
                onClick={executeAction}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${
                  confirmAction.action === "cancel" ? "bg-red-600 hover:bg-red-700" : confirmAction.action === "suspend" ? "bg-amber-600 hover:bg-amber-700" : "bg-brand-600 hover:bg-brand-700"
                }`}
              >
                {confirmAction.action === "suspend" ? "Suspend" : confirmAction.action === "reactivate" ? "Aktifkan" : "Batalkan Permanen"}
              </button>
            </div>
          </div>
        </AppCard>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {LIFECYCLE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => applyFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                lifecycleFilter === f.key
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
            placeholder="Cari apotek..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder-neutral-500 sm:w-64"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <WidgetShell title={`Langganan (${filtered.length})`} loading={loading} error={error} isEmpty={rows.length === 0}>
        {rows.length > 0 && filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">Tidak ada langganan yang cocok dengan filter.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="py-2 pr-3 font-medium text-neutral-500">Apotek</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Paket</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Status</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Kesehatan</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Aksi Cepat</th>
                    <th className="py-2 pl-2 font-medium text-neutral-500">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <tr key={r.tenantId} className="border-b border-neutral-100 dark:border-neutral-800/50">
                      <td className="py-2 pr-3">
                        <span className="font-medium text-neutral-900 dark:text-neutral-50">{r.tenantName}</span>
                        <br /><span className="text-xs text-neutral-400">{r.tenantId?.slice(0, 8)}</span>
                      </td>
                      <td className="py-2 px-2 text-neutral-500 text-xs">{r.packageName ?? "—"}</td>
                      <td className="py-2 px-2">
                        <AppBadge variant={r.stateTone}>
                          {r.lifecycleState?.replace(/_/g, " ") ?? "—"}
                        </AppBadge>
                      </td>
                      <td className="py-2 px-2">
                        <AppBadge variant={r.health.health === "critical" ? "danger" : r.health.health === "attention" ? "warning" : r.health.health === "healthy" ? "success" : "neutral"}>
                          {r.health.icon} {r.health.label}
                        </AppBadge>
                      </td>
                      <td className="py-2 px-2">
                        {r.subscriptionId && (
                          <div className="flex gap-1">
                            {r.actions.canSuspend && (
                              <button onClick={() => setConfirmAction({ subId: r.subscriptionId!, tenantName: r.tenantName, action: "suspend" })}
                                className="rounded border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400">
                                Suspend
                              </button>
                            )}
                            {r.actions.canReactivate && (
                              <button onClick={() => setConfirmAction({ subId: r.subscriptionId!, tenantName: r.tenantName, action: "reactivate" })}
                                className="rounded border border-green-200 px-1.5 py-0.5 text-[10px] font-medium text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400">
                                Aktifkan
                              </button>
                            )}
                            {r.actions.canCancel && (
                              <button onClick={() => setConfirmAction({ subId: r.subscriptionId!, tenantName: r.tenantName, action: "cancel" })}
                                className="rounded border border-red-200 px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400">
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pl-2">
                        <a href={`/platform/tenants/${r.tenantId}`}
                          className="rounded-lg border border-brand-200 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-300">
                          Lihat
                        </a>
                      </td>
                    </tr>
                  ))}
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
