"use client";

import { useState, useMemo, Fragment } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuditStore } from "@/store/audit-store";
import { MAX_AUDIT_PAGE_SIZE } from "@/config/constants";
import type { AuditAction, AuditEntry } from "@/types";

/* ------------------------------------------------------------------ */
/*  Audit Action -> Indonesian Label Mapping                           */
/* ------------------------------------------------------------------ */

const ACTION_LABELS: Record<AuditAction, string> = {
  "auth.login": "Login",
  "auth.logout": "Logout",
  "auth.session_expired": "Sesi Kedaluwarsa",
  "auth.role_switch": "Ganti Peran",
  "transaction.create": "Transaksi Baru",
  "transaction.void": "Batal Transaksi",
  "inventory.movement": "Pergerakan Stok",
  "inventory.opname": "Stok Opname",
  "inventory.expired_writeoff": "Hapus Kedaluwarsa",
  "expansion.approve": "Setujui Ekspansi",
  "expansion.reject": "Tolak Ekspansi",
  "quota.change": "Ubah Kuota",
  "maintenance.enable": "Aktifkan Pemeliharaan",
  "maintenance.disable": "Nonaktifkan Pemeliharaan",
  "tenant.suspend": "Nonaktifkan Tenant",
  "tenant.activate": "Aktifkan Tenant",
};

const ACTION_OPTIONS = Object.keys(ACTION_LABELS) as AuditAction[];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm} ${hh}:${min}`;
  } catch {
    return "—";
  }
}

function getActionLabel(action: AuditAction): string {
  return ACTION_LABELS[action] ?? action;
}

function buildPageRange(current: number, total: number): number[] {
  const pages: number[] = [];
  const start = Math.max(1, current - 3);
  const end = Math.min(total, current + 3);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AuditLogTable() {
  const entries = useAuditStore((s) => s.entries);

  /* ---- Local UI state ---- */
  const [searchText, setSearchText] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "">("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  /* ---- Derived data ---- */
  const filtered = useMemo(() => {
    let result = entries;

    if (actionFilter) {
      result = result.filter((e) => e.action === actionFilter);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.actorName.toLowerCase().includes(q) ||
          e.resourceType.toLowerCase().includes(q) ||
          e.resourceId.toLowerCase().includes(q) ||
          getActionLabel(e.action).toLowerCase().includes(q),
      );
    }

    return result;
  }, [entries, actionFilter, searchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / MAX_AUDIT_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const pageEntries = useMemo(() => {
    const start = (safePage - 1) * MAX_AUDIT_PAGE_SIZE;
    return filtered.slice(start, start + MAX_AUDIT_PAGE_SIZE);
  }, [filtered, safePage]);

  const pageNumbers = useMemo(
    () => buildPageRange(safePage, totalPages),
    [safePage, totalPages],
  );

  /* ---- Handlers ---- */
  function handleSearch(next: string) {
    setSearchText(next);
    setCurrentPage(1);
    setExpandedRows(new Set());
  }

  function handleActionFilter(next: string) {
    setActionFilter(next === "" ? "" : (next as AuditAction));
    setCurrentPage(1);
    setExpandedRows(new Set());
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const clone = new Set(prev);
      if (clone.has(id)) clone.delete(id);
      else clone.add(id);
      return clone;
    });
  }

  function goToPage(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    setExpandedRows(new Set());
  }

  /* ---- Render ---- */
  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari aktor atau resource..."
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-[11px] text-neutral-700 placeholder-neutral-400 outline-none transition-colors focus:border-brand-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:placeholder-neutral-500 dark:focus:border-brand-500 dark:focus:bg-neutral-800/80"
          />
        </div>

        {/* Action filter dropdown */}
        <div className="relative">
          <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <select
            value={actionFilter}
            onChange={(e) => handleActionFilter(e.target.value)}
            className="appearance-none rounded-md border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-7 text-[11px] text-neutral-700 outline-none transition-colors focus:border-brand-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:focus:border-brand-500 dark:focus:bg-neutral-800/80"
          >
            <option value="">Semua Aksi</option>
            {ACTION_OPTIONS.map((act) => (
              <option key={act} value={act}>
                {ACTION_LABELS[act]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>

      {/* ── Empty state ── */}
      {pageEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
          <FileText className="mb-2 h-8 w-8" />
          <p className="text-[11px] font-medium">Tidak ada entri audit</p>
          <p className="mt-0.5 text-[10px] text-neutral-400">
            {searchText || actionFilter
              ? "Coba ubah filter atau kata kunci pencarian"
              : "Belum ada aktivitas yang tercatat"}
          </p>
        </div>
      ) : (
        /* ── Table ── */
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Waktu
                </div>
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Aksi
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Aktor
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Resource
              </th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {pageEntries.map((entry) => {
              const isExpanded = expandedRows.has(entry.id);
              return (
                <Fragment key={entry.id}>
                  {/* ── Data row ── */}
                  <tr
                    className={cn(
                      "border-b border-neutral-50 transition-colors hover:bg-neutral-50 dark:border-neutral-800/50 dark:hover:bg-neutral-800/30",
                      isExpanded &&
                        "bg-neutral-50 dark:bg-neutral-800/20",
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                      {formatDateTime(entry.createdAt)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="inline-block rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {getActionLabel(entry.action)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="text-[11px] text-neutral-700 dark:text-neutral-300">
                        {entry.actorName}
                      </span>
                      {entry.pharmacyId && (
                        <span className="ml-1 text-[10px] text-neutral-400">
                          &middot; {entry.pharmacyId}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                        {entry.resourceType}
                      </span>
                      <span className="mx-1 text-[10px] text-neutral-300 dark:text-neutral-600">
                        /
                      </span>
                      <span className="font-mono text-[11px] text-neutral-500">
                        {entry.resourceId}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => toggleRow(entry.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
                        aria-label={isExpanded ? "Tutup detail" : "Buka detail"}
                      >
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-150",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </button>
                    </td>
                  </tr>

                  {/* ── Expanded detail row ── */}
                  {isExpanded && (
                    <tr>
                      <td
                        colSpan={5}
                        className="border-b border-neutral-100 bg-neutral-50/50 px-4 pb-3 pt-1 dark:border-neutral-800 dark:bg-neutral-800/20"
                      >
                        <DetailContent entry={entry} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── Pagination footer ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
          <p className="text-[10px] text-neutral-400">
            {filtered.length} entri &middot; Halaman {safePage} dari{" "}
            {totalPages}
          </p>
          <div className="flex items-center gap-1">
            {/* Previous */}
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Page numbers */}
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={cn(
                  "flex h-7 min-w-[24px] items-center justify-center rounded-md px-1.5 text-[11px] font-medium transition-colors",
                  p === safePage
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300",
                )}
              >
                {p}
              </button>
            ))}

            {/* Next */}
            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              aria-label="Halaman selanjutnya"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail Content Sub-component                                       */
/* ------------------------------------------------------------------ */

function DetailContent({ entry }: { entry: AuditEntry }) {
  const snapshots = (
    [
      { label: "Before", data: entry.before },
      { label: "After", data: entry.after },
      { label: "Metadata", data: entry.metadata },
    ] as const
  ).filter((s) => s.data !== null);

  if (snapshots.length === 0) {
    return (
      <p className="pl-4 text-[10px] italic text-neutral-400">
        Tidak ada data detail
      </p>
    );
  }

  return (
    <div className="space-y-2 pl-4">
      {snapshots.map(({ label, data }) => (
        <div key={label}>
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            {label}
          </p>
          <pre className="max-h-32 overflow-x-auto rounded-md bg-neutral-100 p-2 text-[10px] leading-relaxed text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}
