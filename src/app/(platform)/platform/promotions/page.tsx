"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { AppBadge } from "@/components/ui/app-badge";
import { AppCard } from "@/components/ui/app-card";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useRefreshable } from "@/components/subscription/use-refreshable";
import { Pagination } from "@/components/subscription/pagination";
import { promotionRepo } from "@/lib/repository-instances";
import type { PromotionCard } from "@/types/subscription-dtos";
import { createPromotion } from "./actions";

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const fmt = (iso: string | null | undefined) =>
  iso && !Number.isNaN(Date.parse(iso))
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const STATUS_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "inactive", label: "Nonaktif" },
];

const typeLabel = (t: string) => t === "percent" ? "Persentase" : t === "fixed" ? "Nominal" : "Trial Extension";

export default function PromotionsPage() {
  const { data, loading, error, refresh } = useRefreshable(() => promotionRepo.listAll());
  const rows: PromotionCard[] = (data ?? []) as PromotionCard[];

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter !== "all") r = r.filter((p) => statusFilter === "active" ? p.isActive : !p.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((p) => p.code.toLowerCase().includes(q) || (p.label ?? "").toLowerCase().includes(q));
    }
    return r;
  }, [rows, statusFilter, search]);

  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
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
              <span className="ml-1 text-neutral-400">
                ({f.key === "all" ? rows.length : rows.filter((p) => f.key === "active" ? p.isActive : !p.isActive).length})
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Cari kode promosi..."
              className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder-neutral-500 sm:w-48"
            />
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-300 dark:hover:bg-brand-900/50"
          >
            {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showCreate ? "Batal" : "Buat"}
          </button>
        </div>
      </div>

      {/* ── Create Form ── */}
      {showCreate && (
        <CreatePromoForm
          onDone={() => {
            setShowCreate(false);
            refresh();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* ── Cards ── */}
      <WidgetShell
        title={`Manajemen Promosi (${filtered.length})`}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="Belum ada promosi. Klik tombol Buat untuk menambahkan promosi baru."
      >
        {rows.length > 0 && filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">Tidak ada promosi yang cocok dengan filter &quot;{statusFilter}&quot;{search ? ` dan kata kunci "${search}"` : ""}.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paged.map((p) => {
                const validNow =
                  p.isActive &&
                  (!p.validFrom || Date.parse(p.validFrom) <= Date.now()) &&
                  (!p.validTo || Date.parse(p.validTo) > Date.now());
                const quotaRemaining =
                  p.maxRedemptions != null ? Math.max(0, p.maxRedemptions - p.redeemedCount) : null;
                const quotaExhausted = quotaRemaining !== null && quotaRemaining <= 0;

                return (
                  <div key={p.code} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-brand-500" />
                          <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">{p.code}</h3>
                        </div>
                        <p className="text-xs text-neutral-500">{p.label ?? "—"}</p>
                      </div>
                      <AppBadge variant={p.isActive ? "success" : "neutral"}>
                        {p.isActive ? "Aktif" : "Nonaktif"}
                      </AppBadge>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs">
                      <Row label="Tipe" value={typeLabel(p.type)} />
                      <Row
                        label="Nilai"
                        value={p.type === "percent" ? `${p.value}%` : rupiah(p.value)}
                      />
                      {p.minAmount != null && <Row label="Min. transaksi" value={rupiah(p.minAmount)} />}
                      {p.maxDiscount != null && <Row label="Maks. diskon" value={rupiah(p.maxDiscount)} />}
                      <Row label="Berlaku" value={p.validFrom ? `${fmt(p.validFrom)} – ${fmt(p.validTo)}` : "Sepanjang waktu"} />
                      {p.appliesToPlanId && <Row label="Paket" value={p.appliesToPlanId.slice(0, 8)} />}
                    </div>

                    {/* Redemption status */}
                    <div className="mt-3 rounded-lg border border-neutral-100 p-2 dark:border-neutral-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500">Pemakaian</span>
                        <span className="font-medium tabular-nums">
                          {p.redeemedCount}{p.maxRedemptions != null ? ` / ${p.maxRedemptions}` : " / ∞"}
                        </span>
                      </div>
                      {p.maxRedemptions != null && (
                        <div className="mt-1 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <div
                            className={`h-1.5 rounded-full ${quotaExhausted ? "bg-red-500" : "bg-brand-500"}`}
                            style={{ width: `${Math.min(100, Math.round((p.redeemedCount / p.maxRedemptions) * 100))}%` }}
                          />
                        </div>
                      )}
                      {quotaExhausted && (
                        <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">Kuota habis</p>
                      )}
                    </div>

                    {/* Validity indicator */}
                    <div className="mt-2">
                      <AppBadge variant={validNow && !quotaExhausted ? "success" : quotaExhausted ? "danger" : "neutral"}>
                        {quotaExhausted ? "❌ Kuota Habis" : validNow ? "✓ Berlaku" : "⏳ Tidak Berlaku"}
                      </AppBadge>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination page={page} totalPages={totalPages} totalResults={filtered.length} onPageChange={setPage} />
          </>
        )}
      </WidgetShell>
    </div>
  );
}

function CreatePromoForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"percent" | "fixed" | "trial_extension">("percent");
  const [value, setValue] = useState(10);
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [acting, setActing] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async () => {
    setFormError("");
    if (!code.trim()) { setFormError("Kode promosi wajib diisi."); return; }
    if (value <= 0) { setFormError("Nilai harus lebih dari 0."); return; }

    setActing(true);
    try {
      const res = await createPromotion({
        code: code.trim().toUpperCase(),
        label: label.trim() || undefined,
        type,
        value,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
      });
      if (res.ok) {
        toast.success(`Promosi "${code.trim().toUpperCase()}" berhasil dibuat.`);
        onDone();
      } else {
        setFormError(res.error ?? "Gagal membuat promosi.");
      }
    } catch {
      setFormError("Terjadi kesalahan tak terduga.");
    } finally {
      setActing(false);
    }
  };

  return (
    <AppCard variant="elevated">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Buat Promosi Baru</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Kode <span className="text-red-500">*</span></label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SAVE10" className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Label</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="Diskon 10%" className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Tipe</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50">
              <option value="percent">Persentase (%)</option>
              <option value="fixed">Nominal (Rp)</option>
              <option value="trial_extension">Trial Extension</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Nilai <span className="text-red-500">*</span></label>
            <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))}
              min={1} max={type === "percent" ? 100 : 999999999}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Maks. Pemakaian</label>
            <input type="number" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)}
              min={1} placeholder="Tak terbatas" className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Berlaku Dari</label>
            <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Berlaku Hingga</label>
            <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
          </div>
        </div>
        {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={acting} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400">Batal</button>
          <button onClick={handleSubmit} disabled={acting}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {acting ? "Membuat..." : "Buat Promosi"}
          </button>
        </div>
      </div>
    </AppCard>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900 dark:text-neutral-50">{value}</span>
    </div>
  );
}
