"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { AppBadge } from "@/components/ui/app-badge";
import { AppCard } from "@/components/ui/app-card";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useRefreshable } from "@/components/subscription/use-refreshable";
import { Pagination } from "@/components/subscription/pagination";
import { useAuthStore } from "@/store/auth-store";
import { trialRequestRepo } from "@/lib/repository-instances";
import type { TrialDeskRow } from "@/types/subscription-dtos";
import { startReview, approveWithPlan, rejectTrial } from "./actions";

const statusTone = (s: string) =>
  s === "approved" ? "success"
  : s === "rejected" ? "danger"
  : s === "reviewing" ? "info"
  : "warning";

const STATUS_TABS: { key: string | "all"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Pending" },
  { key: "reviewing", label: "Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Ditolak" },
];

const fmt = (iso: string | null | undefined) =>
  iso && !Number.isNaN(Date.parse(iso))
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const PAGE_SIZE = 10;

export default function TrialDeskPage() {
  const userId = useAuthStore((s) => s.user?.id ?? "admin");

  const { data, loading, error, refresh } = useRefreshable(() => trialRequestRepo.listQueue());
  const rows: TrialDeskRow[] = data ?? [];

  // ── Filters & Search ──
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter !== "all") r = r.filter((x) => x.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((x) => x.pharmacyName.toLowerCase().includes(q) || x.applicantName.toLowerCase().includes(q) || x.email.toLowerCase().includes(q));
    }
    return r;
  }, [rows, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filter/search changes
  const applyFilter = (s: string | "all") => { setStatusFilter(s); setPage(0); };
  const applySearch = (v: string) => { setSearch(v); setPage(0); };

  // ── Confirmation drawer state ──
  const [confirm, setConfirm] = useState<{
    trial: TrialDeskRow;
    mode: "approve" | "reject";
  } | null>(null);

  const reviewerId = userId;

  return (
    <div className="space-y-4">
      {/* ── Action confirmation panel (inline) ── */}
      {confirm && (
        <ConfirmationPanel
          trial={confirm.trial}
          mode={confirm.mode}
          reviewerId={reviewerId}
          onClose={() => setConfirm(null)}
          onDone={() => {
            setConfirm(null);
            refresh();
          }}
        />
      )}

      {/* ── Toolbar: search + filter ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => applyFilter(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === t.key
                  ? "border-brand-200 bg-white text-brand-700 shadow-sm dark:border-brand-800 dark:bg-neutral-800 dark:text-brand-300"
                  : "border border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {t.label}
              {t.key !== "all" && (
                <span className="ml-1 text-neutral-400">
                  ({rows.filter((r) => t.key === "all" ? true : r.status === t.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => applySearch(e.target.value)}
            placeholder="Cari apotek atau pemohon..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder-neutral-500 sm:w-64"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <WidgetShell title={`Permintaan Trial (${filtered.length})`} loading={loading} error={error} isEmpty={rows.length === 0} emptyText="Tidak ada permintaan trial.">
        {rows.length > 0 && filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">Tidak ada permintaan yang cocok dengan filter &quot;{statusFilter === "all" ? "semua" : statusFilter}&quot;{search ? ` dan kata kunci "${search}"` : ""}.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="py-2 pr-3 font-medium text-neutral-500">Apotek</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Pemohon</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Status</th>
                    <th className="py-2 px-2 font-medium text-neutral-500">Tanggal</th>
                    <th className="py-2 pl-2 font-medium text-neutral-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <TrialRow
                      key={r.id}
                      trial={r}
                      reviewerId={reviewerId}
                      onApprove={() => setConfirm({ trial: r, mode: "approve" })}
                      onReject={() => setConfirm({ trial: r, mode: "reject" })}
                      onRefresh={() => refresh()}
                    />
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

// ── Individual row ──
function TrialRow({
  trial: r, reviewerId,
  onApprove, onReject, onRefresh,
}: {
  trial: TrialDeskRow;
  reviewerId: string;
  onApprove: () => void;
  onReject: () => void;
  onRefresh: () => void;
}) {
  const [acting, setActing] = useState(false);

  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    setActing(true);
    try {
      const res = await fn();
      if (res.ok) {
        toast.success(okMsg);
        onRefresh();
      } else {
        toast.error(res.error ?? "Gagal");
      }
    } catch {
      toast.error("Terjadi kesalahan tak terduga.");
    } finally {
      setActing(false);
    }
  };

  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800/50">
      <td className="py-2 pr-3">
        <span className="font-medium text-neutral-900 dark:text-neutral-50">{r.pharmacyName}</span>
      </td>
      <td className="py-2 px-2 text-neutral-500">
        {r.applicantName}
        <br />
        <span className="text-xs text-neutral-400">{r.email}</span>
      </td>
      <td className="py-2 px-2">
        <AppBadge variant={statusTone(r.status)}>{r.status}</AppBadge>
      </td>
      <td className="py-2 px-2 text-xs text-neutral-400">{fmt(r.createdAt)}</td>
      <td className="py-2 pl-2">
        {r.status === "pending" && (
          <button
            disabled={acting}
            onClick={() =>
              act(async () => startReview(r.id, reviewerId), `Review dimulai untuk ${r.pharmacyName}`)
            }
            className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
          >
            Review
          </button>
        )}
        {r.status === "reviewing" && (
          <div className="flex gap-1">
            <button
              disabled={acting}
              onClick={onApprove}
              className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              disabled={acting}
              onClick={onReject}
              className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
            >
              Tolak
            </button>
          </div>
        )}
        {(r.status === "approved" || r.status === "rejected") && (
          <span className="text-xs text-neutral-400">{r.status === "approved" ? "✓ Selesai" : "✗ Ditolak"}</span>
        )}
      </td>
    </tr>
  );
}

// ── Inline confirmation panel ──
function ConfirmationPanel({
  trial, mode, reviewerId,
  onClose, onDone,
}: {
  trial: TrialDeskRow;
  mode: "approve" | "reject";
  reviewerId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [acting, setActing] = useState(false);
  const [reason, setReason] = useState("");
  const [planId, setPlanId] = useState(trial.requestedPlanId ?? "");
  const [durationDays, setDurationDays] = useState(14);
  const [error, setError] = useState("");

  const isApprove = mode === "approve";

  const handleSubmit = async () => {
    setError("");
    if (!isApprove && !reason.trim()) {
      setError("Alasan penolakan wajib diisi.");
      return;
    }

    setActing(true);
    try {
      let res: { ok: boolean; tenantId?: string; error?: string };
      if (isApprove) {
        res = await approveWithPlan(trial.id, reviewerId, planId || undefined, durationDays);
        if (res.ok) toast.success(`Trial "${trial.pharmacyName}" disetujui & tenant dibuat.`);
      } else {
        res = await rejectTrial(trial.id, reviewerId, reason.trim());
        if (res.ok) toast.success(`Trial "${trial.pharmacyName}" ditolak.`);
      }
      if (!res.ok) {
        setError(res.error ?? "Gagal");
        toast.error(res.error ?? "Gagal");
        return;
      }
      onDone();
    } catch {
      setError("Terjadi kesalahan tak terduga.");
      toast.error("Terjadi kesalahan tak terduga.");
    } finally {
      setActing(false);
    }
  };

  return (
    <AppCard variant="elevated">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {isApprove ? "✓ Setujui Trial" : "✗ Tolak Trial"}
          </h3>
          <button onClick={onClose} disabled={acting} className="text-neutral-400 hover:text-neutral-600 disabled:opacity-40">✕</button>
        </div>

        <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{trial.pharmacyName}</p>
          <p className="text-xs text-neutral-500">{trial.applicantName} · {trial.email}</p>
          {trial.requestedPlanId && <p className="text-xs text-neutral-500">Plan ID: {trial.requestedPlanId.slice(0, 8)}</p>}
        </div>

        {isApprove && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Plan ID (kosongkan untuk paket default)
            </label>
            <input
              type="text"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              placeholder={trial.requestedPlanId?.slice(0, 8) ?? "basic"}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Durasi Trial (hari)
            </label>
            <input
              type="number"
              value={durationDays}
              min={7}
              max={90}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-32 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        )}

        {!isApprove && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Alasan Penolakan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan..."
              rows={3}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        )}

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={acting} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={acting}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 ${
              isApprove ? "bg-brand-600 hover:bg-brand-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {acting ? "Memproses..." : isApprove ? "Setujui & Buat Tenant" : "Tolak"}
          </button>
        </div>
      </div>
    </AppCard>
  );
}
