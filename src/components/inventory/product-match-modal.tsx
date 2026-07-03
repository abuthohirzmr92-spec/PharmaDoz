"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { X, Search, Link2, Package, Hash, Banknote, Calendar, User, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface ProductListItem {
  id: string;
  name: string;
  defaultPrice?: number;
  defaultSellingPrice?: number;
  unit?: string;
  unitLevels?: Array<{ level: number; unitName: string; contains: number }>;
  defaultStorageAreaId: string | null;
  defaultStorageSlot: string | null;
}

interface ImportItemData {
  id: string;
  productName: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  batchNumber: string;
  expiredDate: string;
  supplierName?: string;
  barcode?: string;
  notes?: string;
  matchMethod?: string;
  matchConfidence?: number;
}

interface ProductMatchModalProps {
  open: boolean;
  importItem: ImportItemData | null;
  productList: ProductListItem[];
  onClose: () => void;
  onMatch: (itemId: string, masterProductId: string) => void;
}

const CATEGORIES = ["Semua", "Obat", "Vitamin", "Alkes", "Kosmetik", "Suplemen"];

export function ProductMatchModal({ open, importItem, productList, onClose, onMatch }: ProductMatchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [focusTarget, setFocusTarget] = useState<"search" | "list" | "button">("search");

  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    let result = [...productList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
        // Filter by barcode or code via name match for now
          p.id.toLowerCase().includes(q),
      );
    }

    return result;
  }, [productList, searchQuery]);

  // Reset active index when search changes
  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  // Auto-focus management
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (focusTarget === "search") searchRef.current?.focus();
      else if (focusTarget === "button") buttonRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [open, focusTarget]);

  // Auto-scroll active item into view
  useEffect(() => {
    const el = itemRefs.current.get(activeIndex);
    if (el && listRef.current) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex]);

  // Select product by index — MUST be before early return (hook)
  const selectByIndex = useCallback((index: number) => {
    const product = filteredProducts[index];
    if (product) {
      setSelectedProductId(product.id);
    }
  }, [filteredProducts]);

  // ALL hooks above this line — early return below
  if (!open || !importItem) return null;

  const selectedProduct = productList.find((p) => p.id === selectedProductId);

  const handleMatch = () => {
    if (!selectedProductId) return;
    onMatch(importItem.id, selectedProductId);
    setSearchQuery("");
    setCategoryFilter("Semua");
    setSelectedProductId("");
    setActiveIndex(0);
    setFocusTarget("search");
  };

  const handleClose = () => {
    setSearchQuery("");
    setCategoryFilter("Semua");
    setSelectedProductId("");
    setActiveIndex(0);
    setFocusTarget("search");
    onClose();
  };

  // Keyboard handler for the search input
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusTarget("list");
        // Auto-select first item if nothing selected
        if (filteredProducts.length > 0 && !selectedProductId) {
          selectByIndex(0);
        }
        break;
      case "Enter":
        e.preventDefault();
        if (filteredProducts.length > 0) {
          selectByIndex(activeIndex);
          setFocusTarget("button");
        }
        break;
      case "Escape":
        handleClose();
        break;
      case "Tab":
        e.preventDefault();
        setFocusTarget("button");
        break;
    }
  };

  // Keyboard handler for the product list
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    const max = filteredProducts.length - 1;
    if (max < 0) return;
    let nextIndex = activeIndex;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        nextIndex = Math.min(activeIndex + 1, max);
        break;
      case "ArrowUp":
        e.preventDefault();
        nextIndex = Math.max(activeIndex - 1, 0);
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = max;
        break;
      case "PageDown":
        e.preventDefault();
        nextIndex = Math.min(activeIndex + 8, max);
        break;
      case "PageUp":
        e.preventDefault();
        nextIndex = Math.max(activeIndex - 8, 0);
        break;
      case "Enter":
        e.preventDefault();
        selectByIndex(activeIndex);
        setFocusTarget("button");
        return; // early return — no need to apply nextIndex
        break;
      case "Escape":
        handleClose();
        break;
      case "Tab":
        e.preventDefault();
        setFocusTarget("button");
        break;
      case "/":
        e.preventDefault();
        setSearchQuery("");
        setFocusTarget("search");
        return; // early return — no navigation
    }
    // Apply navigation: single source for both activeIndex + selection
    setActiveIndex(nextIndex);
    selectByIndex(nextIndex);
  };

  // Keyboard handler for match button
  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && selectedProductId) {
      e.preventDefault();
      handleMatch();
    }
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      setFocusTarget("list");
    }
    if (e.key === "Escape") {
      handleClose();
    }
  };

  const sourceLabel = importItem.matchMethod
    ? importItem.matchMethod === "barcode"
      ? "Barcode"
      : importItem.matchMethod === "exact_name"
        ? "Nama Eksak"
        : importItem.matchMethod === "fuzzy"
          ? "Fuzzy Match"
          : importItem.matchMethod === "manual"
            ? "Manual"
            : "Import"
    : "Import";

  const statusLabel = importItem.matchConfidence != null
    ? `Confidence: ${importItem.matchConfidence}%`
    : "Belum Match";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="relative mx-4 flex w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── LEFT PANEL — Import Data (read-only) ── */}
        <div className="w-[42%] shrink-0 border-r border-neutral-200 bg-neutral-50/50 p-5 dark:border-neutral-800 dark:bg-neutral-900/50">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Asal (Hasil Import)
          </h3>

          <div className="space-y-3">
            {/* Product Name */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
                <Package className="h-3 w-3" />
                Nama Produk
              </label>
              <p className="mt-0.5 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {importItem.productName}
              </p>
            </div>

            {/* Unit */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
                <Hash className="h-3 w-3" />
                Satuan
              </label>
              <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">
                {importItem.unit || "—"}
              </p>
            </div>

            {/* Quantity */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
                <Hash className="h-3 w-3" />
                Qty
              </label>
              <p className="mt-0.5 text-sm font-mono text-neutral-700 dark:text-neutral-300">
                {importItem.quantity}
              </p>
            </div>

            {/* Price */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
                <Banknote className="h-3 w-3" />
                Harga Beli
              </label>
              <p className="mt-0.5 text-sm font-mono text-neutral-700 dark:text-neutral-300">
                Rp {importItem.unitPrice.toLocaleString("id-ID")}
              </p>
            </div>

            {/* Batch */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
                <FileText className="h-3 w-3" />
                Batch
              </label>
              <p className="mt-0.5 text-sm font-mono text-neutral-700 dark:text-neutral-300">
                {importItem.batchNumber || "—"}
              </p>
            </div>

            {/* Expired */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
                <Calendar className="h-3 w-3" />
                Expired
              </label>
              <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">
                {importItem.expiredDate || "—"}
              </p>
            </div>

            {/* Supplier */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
                <User className="h-3 w-3" />
                Supplier
              </label>
              <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">
                {importItem.supplierName || "—"}
              </p>
            </div>

            {/* Source */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
                <FileText className="h-3 w-3" />
                Sumber
              </label>
              <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">
                {sourceLabel}
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
                <AlertCircle className="h-3 w-3" />
                Status
              </label>
              <p className="mt-0.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                {statusLabel}
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — Master Product Selection ── */}
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Pilih Master Product
            </h3>
            <button
              onClick={handleClose}
              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3 mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Cari nama, barcode, atau kode produk..."
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-700 placeholder-neutral-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
              ↓
            </kbd>
          </div>

          {/* Category Filter */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                  categoryFilter === cat
                    ? "bg-brand-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Master Product List with Keyboard Navigation */}
          <label className="mb-1 text-[10px] font-medium text-neutral-400">
            Master Product <span className="text-neutral-300">— ↑↓ navigasi · ↵ pilih · Esc tutup · / cari</span>
          </label>
          <div
            ref={listRef}
            tabIndex={0}
            onKeyDown={handleListKeyDown}
            onFocus={() => setFocusTarget("list")}
            className="overflow-y-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" style={{ height: "calc(10 * (1.25rem + 0.5rem))" }}
          >
            {filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-neutral-400">
                Tidak ada produk ditemukan
              </div>
            ) : (
              filteredProducts.map((p, idx) => {
                const isActive = idx === activeIndex;
                const isSelected = p.id === selectedProductId;
                return (
                  <div
                    key={p.id}
                    ref={(el) => { if (el) itemRefs.current.set(idx, el); else itemRefs.current.delete(idx); }}
                    onClick={() => { setActiveIndex(idx); selectByIndex(idx); setFocusTarget("button"); }}
                    className={cn(
                      "flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-brand-100 text-brand-900 dark:bg-brand-900/40 dark:text-brand-100"
                        : isSelected
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-300"
                          : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="ml-2 text-xs text-neutral-400">
                        {p.unit || ""}
                      </span>
                    </div>
                    {p.defaultPrice ? (
                      <span className="ml-2 shrink-0 text-xs tabular-nums text-neutral-500">
                        Rp {p.defaultPrice.toLocaleString("id-ID")}
                      </span>
                    ) : null}
                    {isActive && (
                      <span className="ml-2 shrink-0 text-[10px] text-brand-500">↵</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Selected product preview */}
          {selectedProduct && (
            <div className="mt-2 rounded-lg bg-brand-50 p-2.5 dark:bg-brand-950/30">
              <p className="text-xs font-medium text-brand-700 dark:text-brand-400">
                {selectedProduct.name}
              </p>
              <p className="mt-0.5 text-[10px] text-brand-500">
                {selectedProduct.unit || "—"} · Rp {selectedProduct.defaultPrice?.toLocaleString("id-ID") || "—"}
              </p>
            </div>
          )}

          {/* Match Button */}
          <button
            ref={buttonRef}
            onClick={handleMatch}
            onKeyDown={handleButtonKeyDown}
            disabled={!selectedProductId}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <Link2 className="h-4 w-4" />
            Satukan Produk
          </button>
        </div>
      </div>
    </div>
  );
}
