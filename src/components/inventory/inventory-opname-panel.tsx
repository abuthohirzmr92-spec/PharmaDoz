"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Clipboard,
  CheckCircle,
  Clock,
  Settings,
  Plus,
} from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import type { OpnameStatus } from "@/types/inventory";
import { cn } from "@/lib/cn";
import { InventoryOpnameFormModal } from "./inventory-opname-form-modal";
import { OpnameSessionStartModal } from "./opname-session-start-modal";
import { useOpnameSessionStore } from "@/store/opname-session-store";
import { FEATURES } from "@/config/features";
import { buildMultiUnitSummary } from "@/lib/unit-opname";

const STATUS_STYLE: Record<OpnameStatus, { icon: typeof CheckCircle; cls: string; label: string }> = {
  draft: { icon: Clock, cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", label: "Draft" },
  confirmed: { icon: CheckCircle, cls: "text-green-600 bg-green-50 dark:bg-green-950/30", label: "Confirm" },
  adjusted: { icon: Settings, cls: "text-blue-600 bg-blue-50 dark:bg-blue-950/30", label: "Adjusted" },
};

export function InventoryOpnamePanel() {
  const searchQuery = useInventoryStore((s) => s.searchQuery);
  const setSearchQuery = useInventoryStore((s) => s.setSearchQuery);
  const loadDemoData = useInventoryStore((s) => s.loadDemoData);
  const opnames = useInventoryStore((s) => s.stockOpnames);
  const batches = useInventoryStore((s) => s.batches);

  useEffect(() => {
    if (batches.length === 0) loadDemoData();
  }, [batches.length, loadDemoData]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reasonFilter, setReasonFilter] = useState<string>("");
  const [showOpnameForm, setShowOpnameForm] = useState(false);
  // RC1 P0E — Session start modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const activeSession = useOpnameSessionStore((s) => s.activeSession);

  const REASON_OPTIONS = ["Kadaluarsa", "Rusak", "Hilang", "Sistem", "Lainnya"] as const;

  const filtered = useMemo(() => {
    let result = opnames;

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.conductedBy.toLowerCase().includes(q) ||
          o.notes.toLowerCase().includes(q) ||
          o.items.some(
            (i) =>
              i.productName.toLowerCase().includes(q) ||
              i.batchNumber.toLowerCase().includes(q),
          ),
      );
    }

    // Filter by reason
    if (reasonFilter) {
      result = result.filter((o) =>
        o.items.some((i) => i.note.toLowerCase().includes(reasonFilter.toLowerCase())),
      );
    }

    return result;
  }, [opnames, searchQuery, reasonFilter]);

  return (
    <div>
      {/* Search + Reason filter + Create button */}
      <div className="mb-4 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari opname, produk, atau batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs text-neutral-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 appearance-none"
        >
          <option value="">Semua Alasan</option>
          {REASON_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          onClick={() => setShowSessionModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Mulai Session Opname
        </button>
        {FEATURES.legacyOpname && (
          <button
            onClick={() => setShowOpnameForm(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
          >
            Buat Manual
          </button>
        )}
      </div>

      {/* Session Banner */}
      {activeSession && activeSession.status !== "completed" && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-brand-800 dark:text-brand-200">📋 {activeSession.title}</h3>
              <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-400">
                {activeSession.selectedLocationIds.length > 0
                  ? `Lokasi: ${activeSession.selectedLocationIds.join(", ")}`
                  : "Semua Lokasi"}
              </p>
            </div>
            <span className={cn(
              "rounded px-2 py-1 text-[10px] font-medium",
              activeSession.status === "in_progress" && "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
              activeSession.status === "paused" && "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
            )}>
              {activeSession.status === "in_progress" ? "In Progress" : activeSession.status === "paused" ? "Paused" : activeSession.status}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-brand-600 dark:text-brand-400 mb-1">
              <span>{activeSession.completedItems} / {activeSession.totalItems} batch</span>
              <span className="font-bold">{activeSession.progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-brand-200 dark:bg-brand-900">
              <div
                className="h-2 rounded-full bg-brand-500 transition-all duration-300"
                style={{ width: `${activeSession.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Session Start Modal */}
      <OpnameSessionStartModal open={showSessionModal} onClose={() => setShowSessionModal(false)} />

      {/* Opname Form Modal */}
      <InventoryOpnameFormModal open={showOpnameForm} onClose={() => setShowOpnameForm(false)} />

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[5%] px-3 py-2.5" />
              <th className="w-[18%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Tanggal
              </th>
              <th className="w-[15%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Status
              </th>
              <th className="w-[17%] hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Petugas
              </th>
              <th className="w-[12%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Item
              </th>
              <th className="w-[12%] hidden md:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Selisih
              </th>
              <th className="w-[21%] hidden lg:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Catatan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <Clipboard className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Belum ada sesi stock opname
                </td>
              </tr>
            ) : (
              filtered.map((opname) => {
                const isExpanded = expandedId === opname.id;
                const st = STATUS_STYLE[opname.status];
                const StatusIcon = st.icon;
                const diffCount = opname.items.filter(
                  (i) => i.difference !== 0,
                ).length;

                return (
                  <tr key={opname.id} className="group">
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : opname.id)
                        }
                        className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        {new Date(opname.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>
                        <StatusIcon className="h-3 w-3" />
                        {st.label}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5">
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {opname.conductedBy}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-sm tabular-nums text-neutral-900 dark:text-neutral-50">
                        {opname.items.length}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 text-right">
                      <span
                        className={cn(
                          "text-sm tabular-nums font-medium",
                          diffCount > 0
                            ? "text-amber-600"
                            : "text-green-600",
                        )}
                      >
                        {diffCount > 0 ? `${diffCount}` : "0"}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-3 py-2.5">
                      <span className="text-xs text-neutral-500 truncate block">
                        {opname.notes}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded: item detail */}
      {expandedId && (
        <OpnameDetailPanel
          opnameId={expandedId}
          onClose={() => setExpandedId(null)}
        />
      )}
    </div>
  );
}

const REASON_COLORS: Record<string, string> = {
  Kadaluarsa: "bg-red-50 text-red-600 dark:bg-red-950/30",
  Rusak: "bg-orange-50 text-orange-600 dark:bg-orange-950/30",
  Hilang: "bg-amber-50 text-amber-600 dark:bg-amber-950/30",
  Sistem: "bg-blue-50 text-blue-600 dark:bg-blue-950/30",
  Lainnya: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800",
};

function getReasonFromNote(note: string): string {
  for (const r of Object.keys(REASON_COLORS)) {
    if (note.toLowerCase().startsWith(r.toLowerCase())) return r;
  }
  return "";
}

function OpnameDetailPanel({
  opnameId,
  onClose,
}: {
  opnameId: string;
  onClose: () => void;
}) {
  const opname = useInventoryStore((s) =>
    s.stockOpnames.find((o) => o.id === opnameId),
  );

  if (!opname) return null;

  const baseLabel = (item: any): string => item?.baseUnit || "pcs";

  return (
    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Detail Opname � {new Date(opname.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </h4>
        <button onClick={onClose} className="text-[10px] text-neutral-400 hover:text-neutral-600">Tutup</button>
      </div>

      <div className="space-y-3">
        {opname.items.map((item, idx) => {
          const unit = baseLabel(item);
          const detail = buildMultiUnitSummary((item as any).multiUnitCounts, unit);
          const hasVariance = item.difference !== 0;

          return (
            <div key={`${item.productId}-${item.batchId || idx}`} className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
              {/* Header: product + batch + variance badge */}
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{item.productName}</p>
                  <p className="text-[10px] font-mono text-neutral-400">{item.batchNumber || "�"}</p>
                </div>
                {hasVariance && (
                  <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold tabular-nums",
                    item.difference > 0 ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400")}>
                    {item.difference > 0 ? "+" : ""}{item.difference} {unit}
                  </span>
                )}
              </div>

              {/* Detail grid: 2 columns */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="text-neutral-400">Detail Hitung</span>
                  <p className="font-medium text-neutral-700 dark:text-neutral-300">{detail}</p>
                </div>
                <div className="text-right">
                  <span className="text-neutral-400">Qty Fisik</span>
                  <p className="font-medium tabular-nums text-neutral-700 dark:text-neutral-300">{item.physicalQty} {unit}</p>
                </div>
                <div>
                  <span className="text-neutral-400">Qty Sistem</span>
                  <p className="tabular-nums text-neutral-500">{item.systemQty} {unit}</p>
                </div>
                <div className="text-right">
                  <span className="text-neutral-400">Selisih</span>
                  <p className={cn("font-medium tabular-nums",
                    item.difference > 0 ? "text-green-600" : item.difference < 0 ? "text-red-600" : "text-neutral-400")}>
                    {item.difference > 0 ? "+" : ""}{item.difference} {unit}
                  </p>
                </div>
                {item.note && (
                  <div className="col-span-2">
                    <span className="text-neutral-400">Catatan</span>
                    <p className="text-neutral-600 dark:text-neutral-400">{item.note}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: conducted by + date */}
      <div className="mt-3 flex items-center gap-3 text-[10px] text-neutral-400">
        <span>Dilakukan Oleh: {opname.conductedBy || "�"}</span>
        <span>�</span>
        <span>{new Date(opname.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
      </div>
    </div>
  );
}

