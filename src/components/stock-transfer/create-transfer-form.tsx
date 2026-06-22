"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ArrowRightLeft, Plus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import { useStockTransferStore } from "@/store/stock-transfer-store";
import { useBranchStore } from "@/store/branch-store";
import { productRepo } from "@/lib/repository-instances";
import type { ProductBatch } from "@/types/inventory";
import { cn } from "@/lib/cn";
import { NumericInput } from "@/components/shared/numeric-input";

/* ------------------------------------------------------------------ */
/*  Product Search Result                                              */
/* ------------------------------------------------------------------ */

interface ProductSearchResult {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function CreateTransferForm() {
  const createTransfer = useStockTransferStore((s) => s.createTransfer);
  const loadTransfers = useStockTransferStore((s) => s.loadTransfers);
  const branches = useBranchStore((s) => s.branches);

  /* ---- Form Fields ---- */
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  /* ---- Async State ---- */
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ---- Derived ---- */
  const activeBranches = useMemo(
    () => branches.filter((b) => b.isActive),
    [branches],
  );

  /* ---- Load products on mount ---- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoadingProducts(true);
      try {
        if (productRepo.isConnected) {
          const raw = await productRepo.getRawProducts({ isActive: true });
          if (!cancelled) {
            setProducts(
              raw.map((p) => ({ id: p.id, name: p.name })).sort((a, b) => a.name.localeCompare(b.name)),
            );
          }
        }
      } catch {
        // Fallback: derive from branch batches
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  /* ---- Load batches when product + source branch changes ---- */
  useEffect(() => {
    if (!selectedProductId || !fromBranchId) {
      setBatches([]);
      setSelectedBatchId("");
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoadingBatches(true);
      try {
        // Query batches directly for the selected product in the source branch
        if (isSupabaseConnected()) {
          const tenantId = productRepo.getTenantId();
          if (!tenantId) throw new Error("Tenant context required to load transfer batches");

          const { data, error } = await supabase!
            .from("product_batches")
            .select("*, product:product_id(name)")
            .is("deleted_at", null)
            .eq("tenant_id", tenantId)
            .eq("product_id", selectedProductId)
            .eq("pharmacy_id", fromBranchId)
            .gt("quantity", 0);

          if (error) throw error;

          if (!cancelled) {
            const mapped: ProductBatch[] = (data || []).map((row: any) => ({
              id: row.id,
              tenantId: row.tenant_id ?? "",
              productId: row.product_id,
              productName: row.product?.name ?? "",
              batchNumber: row.batch_number,
              expiredDate: row.expired_date,
              quantity: row.quantity,
              unitPrice: row.unit_price,
              sellingPrice: row.selling_price,
              createdAt: row.created_at,
            }));

            setBatches(mapped);
            if (mapped.length === 1) {
              setSelectedBatchId(mapped[0]!.id);
            } else {
              setSelectedBatchId("");
            }
          }
        } else {
          if (!cancelled) {
            setBatches([]);
            setSelectedBatchId("");
          }
        }
      } catch (e) {
        console.error("Failed to load batches for transfer form:", e);
        if (!cancelled) setBatches([]);
      } finally {
        if (!cancelled) setIsLoadingBatches(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedProductId, fromBranchId]);

  /* ---- Product search filter ---- */
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  /* ---- Handlers ---- */
  const handleProductSelect = useCallback((product: ProductSearchResult) => {
    setSelectedProductId(product.id);
    setSelectedProductName(product.name);
    setProductSearch(product.name);
    setShowProductDropdown(false);
  }, []);

  const handleProductSearchChange = useCallback(
    (value: string) => {
      setProductSearch(value);
      setShowProductDropdown(true);
      if (value !== selectedProductName) {
        setSelectedProductId("");
        setSelectedProductName("");
      }
    },
    [selectedProductName],
  );

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!fromBranchId) {
      toast.error("Pilih cabang asal");
      return;
    }
    if (!toBranchId) {
      toast.error("Pilih cabang tujuan");
      return;
    }
    if (fromBranchId === toBranchId) {
      toast.error("Cabang asal dan tujuan harus berbeda");
      return;
    }
    if (!selectedProductId) {
      toast.error("Pilih produk yang akan ditransfer");
      return;
    }
    if (quantity <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }

    setIsSubmitting(true);

    try {
      await createTransfer({
        fromPharmacyId: fromBranchId,
        toPharmacyId: toBranchId,
        productId: selectedProductId,
        batchId: selectedBatchId || undefined,
        quantity,
        note: note || undefined,
      });

      toast.success("Transfer stok berhasil dibuat");
      await loadTransfers();

      // Reset form
      setFromBranchId("");
      setToBranchId("");
      setProductSearch("");
      setSelectedProductId("");
      setSelectedProductName("");
      setSelectedBatchId("");
      setQuantity(1);
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat transfer");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    fromBranchId,
    toBranchId,
    selectedProductId,
    quantity,
    selectedBatchId,
    note,
    createTransfer,
    loadTransfers,
  ]);

  /* ---- Render ---- */
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
          <ArrowRightLeft className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Transfer Stok Baru
          </h3>
          <p className="text-[10px] text-neutral-500">
            Kirim stok antar cabang
          </p>
        </div>
      </div>

      {/* Branch Selection */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
        <div>
          <label className="block text-[10px] font-medium text-neutral-500 mb-1">
            Cabang Asal *
          </label>
          <select
            value={fromBranchId}
            onChange={(e) => {
              setFromBranchId(e.target.value);
              setSelectedBatchId("");
            }}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          >
            <option value="">Pilih cabang asal...</option>
            {activeBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-neutral-500 mb-1">
            Cabang Tujuan *
          </label>
          <select
            value={toBranchId}
            onChange={(e) => setToBranchId(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          >
            <option value="">Pilih cabang tujuan...</option>
            {activeBranches
              .filter((b) => b.id !== fromBranchId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Product Search */}
      <div className="mb-3">
        <label className="block text-[10px] font-medium text-neutral-500 mb-1">
          Produk *
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder={isLoadingProducts ? "Memuat produk..." : "Cari produk..."}
            value={productSearch}
            onChange={(e) => handleProductSearchChange(e.target.value)}
            onFocus={() => setShowProductDropdown(true)}
            onBlur={() => {
              // Delay to allow click on dropdown item
              setTimeout(() => setShowProductDropdown(false), 200);
            }}
            disabled={isLoadingProducts}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-700 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
          {showProductDropdown && filteredProducts.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg max-h-48 overflow-y-auto dark:border-neutral-700 dark:bg-neutral-800">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleProductSelect(p);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-xs hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors",
                    selectedProductId === p.id
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300"
                      : "text-neutral-700 dark:text-neutral-300",
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {showProductDropdown && productSearch && filteredProducts.length === 0 && !isLoadingProducts && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg p-3 text-center dark:border-neutral-700 dark:bg-neutral-800">
              <span className="text-xs text-neutral-400">
                Produk tidak ditemukan
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Batch Selection */}
      <div className="mb-3">
        <label className="block text-[10px] font-medium text-neutral-500 mb-1">
          Batch (opsional)
        </label>
        <select
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          disabled={!selectedProductId || !fromBranchId || isLoadingBatches}
          className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
        >
          {isLoadingBatches ? (
            <option value="">Memuat batch...</option>
          ) : !selectedProductId || !fromBranchId ? (
            <option value="">Pilih produk dan cabang asal terlebih dahulu</option>
          ) : batches.length === 0 ? (
            <option value="">Tidak ada batch tersedia</option>
          ) : (
            <>
              <option value="">Semua batch (FEFO)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} — {b.quantity} pcs (ED:{" "}
                  {new Date(b.expiredDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                  )
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {/* Quantity & Note */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
        <div>
          <label className="block text-[10px] font-medium text-neutral-500 mb-1">
            Jumlah *
          </label>
          <NumericInput
            value={quantity}
            min={1}
            onChange={(v) => setQuantity(v)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-neutral-500 mb-1">
            Catatan (opsional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={1}
            placeholder="Catatan transfer..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-700 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
      </div>

      {/* Validation Info */}
      {fromBranchId === toBranchId && fromBranchId && (
        <p className="mb-3 text-[10px] text-red-500">
          Cabang asal dan tujuan harus berbeda
        </p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={cn(
          "w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors",
          isSubmitting
            ? "bg-brand-400 cursor-not-allowed"
            : "bg-brand-600 hover:bg-brand-700",
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Memproses...
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            Buat Transfer Stok
          </>
        )}
      </button>
    </div>
  );
}
