"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Filter, ChevronDown, ChevronRight, Check, X, Archive, GitMerge, Loader2, Star, Users, Package, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { supabase } from "@/lib/supabase/client";
import type { CandidateStatus } from "@/types/product-knowledge";
import { evaluateSimilarity, type SimilarityResult } from "@/lib/mpkb/similarity-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CandidateRow {
  id: string;
  name: string;
  normalized_name: string;
  barcode: string | null;
  manufacturer: string | null;
  category: string;
  base_unit: string;
  unit_levels: string | null;
  source_type: string;
  status: CandidateStatus;
  occurrence_count: number;
  tenant_usage_count: number;
  quality_score: number;
  submitted_at: string;
  source_tenant_ids: string[] | null;
}

type StatusFilter = CandidateStatus | "all";

const STATUS_COLORS: Record<CandidateStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  archived: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

const STATUS_LABELS: Record<CandidateStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  excel_import: "Excel Import",
  ocr_import: "OCR",
  api_import: "API",
  copy: "Copy",
  migration: "Migration",
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function parseUnitLevels(raw: string | null): string {
  if (!raw) return "—";
  try {
    const levels = JSON.parse(raw) as { unitName: string; contains: number }[];
    return levels.map(l => `${l.unitName} (${l.contains})`).join(" → ");
  } catch { return "—"; }
}

function scoreBreakdown(row: CandidateRow): { label: string; value: number }[] {
  const items: { label: string; value: number }[] = [];
  if (row.barcode) items.push({ label: "Barcode", value: 10 });
  if (row.manufacturer) items.push({ label: "Manufacturer", value: 10 });
  if (row.unit_levels) items.push({ label: "Multi Unit", value: 15 });
  const tc = row.tenant_usage_count || 0;
  if (tc >= 3) items.push({ label: `Used by ${tc} tenants`, value: 30 });
  else if (tc >= 1) items.push({ label: `Used by ${tc} tenant${tc > 1 ? "s" : ""}`, value: 10 });
  items.push({ label: "Base", value: 0 });
  return items;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CandidateReviewPage() {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [globalProducts, setGlobalProducts] = useState<Array<{ id: string; name: string; barcode?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [selected, setSelected] = useState<CandidateRow | null>(null);
  const [conflict, setConflict] = useState<SimilarityResult | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      let query = (supabase as any).from("candidate_products").select("*").order("submitted_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (search) query = query.or(`name.ilike.%${search}%,normalized_name.ilike.%${search}%,barcode.ilike.%${search}%`);
      const { data } = await query;
      setCandidates(data || []);
    } catch { toast.error("Gagal memuat candidate queue."); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { loadCandidates(); }, [loadCandidates]);
  useEffect(() => {
    if (supabase) (supabase as any).from("global_products").select("id,name,barcode").then(({ data }: any) => setGlobalProducts(data || [])).catch(() => {});
  }, []);
  // Evaluate similarity when selected candidate changes
  useEffect(() => {
    if (selected && globalProducts.length > 0) {
      setConflict(evaluateSimilarity(
        { name: selected.name, barcode: selected.barcode },
        globalProducts,
      ));
    } else { setConflict(null); }
  }, [selected, globalProducts]);

  const handleAction = useCallback(async (id: string, action: "approved" | "rejected" | "archived") => {
    if (!supabase) return;
    const c = candidates.find(r => r.id === id);
    if (!c) return;
    try {
      if (action === "approved") {
        // RC1.5 P1B — Zero duplicate: evaluate against ALL global products
        const bestMatch = evaluateSimilarity(
          { name: c.name, barcode: c.barcode },
          globalProducts,
        );

        if (bestMatch && bestMatch.level === "block") {
          // AUTO BLOCK: similarity ≥95 → must merge
          const globalRef = await (supabase as any).from("global_products").select("tenant_usage_count").eq("id", bestMatch.matchedProduct.id).single();
          const newCount = (globalRef.data?.tenant_usage_count || 0) + 1;
          await (supabase as any).from("global_products")
            .update({ tenant_usage_count: newCount, updated_at: new Date().toISOString() })
            .eq("id", bestMatch.matchedProduct.id);
          await (supabase as any).from("candidate_products")
            .update({ status: "archived", reviewed_at: new Date().toISOString() })
            .eq("id", id);
          setConflict(null);
          toast.success(`Digabungkan: similarity ${bestMatch.score}% → ${bestMatch.matchedProduct.name}`);
        } else if (bestMatch && bestMatch.level === "warn") {
          // WARNING: similarity 80-94 → confirm required
          toast.warning(`Similarity ${bestMatch.score}% dengan ${bestMatch.matchedProduct.name}. Konfirmasi diperlukan.`);
          setConflict(bestMatch);
        } else {
          // SAFE: create new global product
          await (supabase as any).from("global_products").insert({
            name: c.name, barcode: c.barcode, manufacturer: c.manufacturer,
            category: c.category, base_unit: c.base_unit, unit_levels: c.unit_levels,
            quality_score: c.quality_score, tenant_usage_count: c.tenant_usage_count,
            source_candidate_id: c.id,
          });
          await (supabase as any).from("candidate_products")
            .update({ status: "approved", reviewed_at: new Date().toISOString() })
            .eq("id", id);
          toast.success("Produk disetujui dan ditambahkan ke Global Library.");
          setConflict(null);
        }
      } else {
        await (supabase as any).from("candidate_products")
          .update({ status: action, reviewed_at: new Date().toISOString() })
          .eq("id", id);
        toast.success(`Status diubah ke ${STATUS_LABELS[action]}.`);
      }
      loadCandidates();
      setSelected(null);
    } catch { toast.error("Gagal mengupdate status."); }
  }, [candidates, loadCandidates]);

  // RC1.5 P1A — Similar products detection (read-only, no AI)
  const similarProducts = useMemo(() => {
    if (!selected) return [];
    const norm = selected.normalized_name || selected.name.toLowerCase().trim();
    const words = norm.split(" ").filter(w => w.length > 2);
    return candidates.filter(c => {
      if (c.id === selected.id) return false;
      const cNorm = c.normalized_name || c.name.toLowerCase().trim();
      // Simple word overlap
      const overlap = words.filter(w => cNorm.includes(w)).length;
      return overlap >= Math.ceil(words.length * 0.6);
    }).slice(0, 5);
  }, [selected, candidates]);

  const filtered = useMemo(() => candidates, [candidates]);

  if (!supabase) return <div className="p-8 text-center text-neutral-400">Tidak terhubung ke database.</div>;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 dark:border-neutral-800">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Candidate Product Queue</h1>
        <p className="text-sm text-neutral-500">Review dan kelola produk yang diajukan tenant untuk Global Product Library.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 border-b px-6 py-3 dark:border-neutral-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, barcode..." className="w-full rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </select>
        <button onClick={loadCandidates} className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          ↻ Refresh
        </button>
      </div>

      {/* Main: list + detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-neutral-400">Tidak ada candidate.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white dark:bg-neutral-950">
                <tr className="border-b text-left text-[10px] font-medium uppercase text-neutral-400 dark:border-neutral-800">
                  <th className="px-4 py-2">Nama Produk</th>
                  <th className="px-2 py-2">Barcode</th>
                  <th className="px-2 py-2 hidden md:table-cell">Kategori</th>
                  <th className="px-2 py-2 hidden lg:table-cell">Multi Unit</th>
                  <th className="px-2 py-2 text-center">#</th>
                  <th className="px-2 py-2 text-center">⭐</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 hidden md:table-cell">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-neutral-800">
                {filtered.map(row => (
                  <tr key={row.id} onClick={() => { setSelected(row); setExpanded(row.id); }}
                    className={cn("cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors",
                      selected?.id === row.id && "bg-brand-50/50 dark:bg-brand-950/20")}>
                    <td className="px-4 py-2 font-medium text-neutral-900 dark:text-neutral-50">{row.name}</td>
                    <td className="px-2 py-2 font-mono text-neutral-500">{row.barcode || "—"}</td>
                    <td className="px-2 py-2 hidden md:table-cell text-neutral-500">{row.category}</td>
                    <td className="px-2 py-2 hidden lg:table-cell text-neutral-500">{parseUnitLevels(row.unit_levels)}</td>
                    <td className="px-2 py-2 text-center tabular-nums font-medium">{row.occurrence_count}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{row.quality_score}</td>
                    <td className="px-2 py-2"><span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium", STATUS_COLORS[row.status])}>{STATUS_LABELS[row.status]}</span></td>
                    <td className="px-2 py-2 hidden md:table-cell text-neutral-400">{formatDate(row.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-80 shrink-0 overflow-auto border-l bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-4 w-4" /></button>
            </div>

            {/* General */}
            <div className="space-y-2 text-xs">
              <div><span className="text-neutral-400">Barcode:</span> <span className="font-mono">{selected.barcode || "—"}</span></div>
              <div><span className="text-neutral-400">Manufacturer:</span> {selected.manufacturer || "—"}</div>
              <div><span className="text-neutral-400">Category:</span> {selected.category}</div>
              <div><span className="text-neutral-400">Base Unit:</span> {selected.base_unit}</div>
              <div><span className="text-neutral-400">Multi Unit:</span> {parseUnitLevels(selected.unit_levels)}</div>
              <div><span className="text-neutral-400">Source:</span> {SOURCE_LABELS[selected.source_type] || selected.source_type}</div>
            </div>

            {/* Usage */}
            <div className="mt-4 space-y-1 text-xs">
              <p className="font-medium text-neutral-600">Usage</p>
              <div><span className="text-neutral-400">Occurrences:</span> <span className="font-bold">{selected.occurrence_count}</span></div>
              <div><span className="text-neutral-400">Tenants:</span> <span className="font-bold">{selected.tenant_usage_count}</span></div>
              {selected.source_tenant_ids && selected.source_tenant_ids.length > 0 && (
                <div className="text-[10px] text-neutral-400">{selected.source_tenant_ids.length} tenant IDs</div>
              )}
            </div>

            {/* Quality Insight Card */}
            <div className="mt-4 space-y-1 rounded-lg border border-neutral-200 p-3 text-xs dark:border-neutral-700">
              <p className="font-medium text-neutral-600">Quality Score: <span className="font-bold">{selected.quality_score}/100</span></p>
              <div className="mt-1 space-y-0.5">
                {scoreBreakdown(selected).map((item, i) => (
                  <div key={i} className="flex justify-between text-neutral-500">
                    <span>{item.label}</span><span className="tabular-nums">+{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-400">
                {selected.barcode && <span>✓ Barcode</span>}
                {selected.manufacturer && <span>✓ Manuf</span>}
                {selected.unit_levels && <span>✓ Multi</span>}
              </div>
            </div>

            {/* Similar Products Card */}
            {similarProducts.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950/20">
                <p className="font-medium text-amber-800">Kemungkinan Produk Mirip</p>
                <div className="mt-1.5 space-y-1">
                  {similarProducts.map(sp => (
                    <div key={sp.id} className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                      <span className="truncate">{sp.name}</span>
                      <span className="ml-2 shrink-0 text-[10px] opacity-70">
                        {sp.quality_score}%
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-amber-500">Read-only — untuk awareness</p>
              </div>
            )}

            {/* Tenant Source Info */}
            <div className="mt-3 space-y-1 rounded-lg border border-neutral-200 p-3 text-xs dark:border-neutral-700">
              <p className="font-medium text-neutral-600">Tenant Source</p>
              <p className="text-neutral-500">{SOURCE_LABELS[selected.source_type] || selected.source_type}</p>
              <div className="mt-1 flex gap-3 text-neutral-400">
                <span>Occurrence: <strong className="text-neutral-600">{selected.occurrence_count}</strong></span>
                <span>Tenants: <strong className="text-neutral-600">{selected.tenant_usage_count}</strong></span>
              </div>
              <p className="text-[10px] text-neutral-400">Pertama: {formatDate(selected.submitted_at)}</p>
            </div>

            {/* Conflict Card */}
            {conflict && conflict.level !== "safe" && (
              <div className={cn("mt-4 rounded-lg border p-3 text-xs",
                conflict.level === "block" ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20")}>
                <p className={cn("font-bold", conflict.level === "block" ? "text-red-800" : "text-amber-800")}>
                  {conflict.level === "block" ? "⛔ DUPLICATE DETECTED" : "⚠️ POTENTIAL DUPLICATE"}
                </p>
                <div className="mt-1.5 space-y-1">
                  <p className="text-neutral-600">Global: <span className="font-medium">{conflict.matchedProduct.name}</span></p>
                  <p className="text-neutral-600">Candidate: <span className="font-medium">{selected.name}</span></p>
                  <p className="font-mono text-lg font-bold text-neutral-800">{conflict.score}% similar</p>
                </div>
                {conflict.level === "warn" && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleAction(selected.id, "approved")}
                      className="flex-1 rounded bg-amber-600 px-2 py-1.5 text-[10px] font-medium text-white hover:bg-amber-700">
                      Merge & Archive
                    </button>
                    <button onClick={async () => {
                      await (supabase as any).from("global_products").insert({
                        name: selected.name, barcode: selected.barcode, manufacturer: selected.manufacturer,
                        category: selected.category, base_unit: selected.base_unit, unit_levels: selected.unit_levels,
                        quality_score: selected.quality_score, tenant_usage_count: selected.tenant_usage_count,
                        source_candidate_id: selected.id,
                      });
                      await (supabase as any).from("candidate_products").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", selected.id);
                      toast.success("Force created (override).");
                      loadCandidates(); setSelected(null); setConflict(null);
                    }}
                      className="rounded bg-red-600 px-2 py-1.5 text-[10px] font-medium text-white hover:bg-red-700">
                      Force Create
                    </button>
                  </div>
                )}
                {conflict.level === "block" && (
                  <button onClick={() => handleAction(selected.id, "approved")}
                    className="mt-2 w-full rounded bg-red-600 px-2 py-1.5 text-[10px] font-medium text-white hover:bg-red-700">
                    Merge & Archive (Required)
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            {selected.status === "pending" && (
              <div className="mt-4 space-y-2">
                <button onClick={() => handleAction(selected.id, "approved")}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700">
                  <Check className="h-3.5 w-3.5" /> Approve & Add to Global Library
                </button>
                <button onClick={() => handleAction(selected.id, "rejected")}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-950/30 dark:text-red-400">
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
                <button onClick={() => handleAction(selected.id, "archived")}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400">
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
              </div>
            )}
            {selected.status !== "pending" && (
              <div className="mt-4">
                <button onClick={() => handleAction(selected.id, "archived")}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400">
                  <Archive className="h-3.5 w-3.5" /> Move to Archive
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
