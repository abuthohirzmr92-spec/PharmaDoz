"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Pill, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ProductTable, type ProductRow } from "@/components/products/product-table";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { usePermission } from "@/hooks/use-auth";
import { productRepo } from "@/lib/repository-instances";
import { useInventoryStore } from "@/store/inventory-store";
import { useBranchStore } from "@/store/branch-store";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { cn } from "@/lib/cn";

export function ProductsPageContent() {
  const canEdit = usePermission("products.edit");
  const activeBranch = useBranchStore((s) => s.activeBranch);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(checkDemoMode());

  const loadProducts = useCallback(async () => {
    setIsLoading(true);

    try {
      if (productRepo.isConnected) {
        setIsDemoMode(false);

        // Use getProducts() which JOINs product_batches and computes
        // totalStock = SUM(batch.quantity) — filtered by active branch.
        const inventoryProducts = await productRepo.getProducts();

        const mapped: ProductRow[] = inventoryProducts.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          categoryId: p.categoryId ?? p.category,
          unit: p.unit,
          unitLevels: p.unitLevels ?? [],
          barcode: p.barcode,
          defaultPrice: p.defaultPrice,
          defaultSellingPrice: p.defaultSellingPrice,
          description: p.description ?? null,
          requiresPrescription: p.requiresPrescription,
          minStock: p.minStock,
          totalStock: activeBranch
            ? p.batches.filter((b) => b.pharmacyId === activeBranch.id).reduce((s, b) => s + b.quantity, 0)
            : p.totalStock,
          isActive: p.isActive,
        }));

        setProducts(mapped);
      } else if (checkDemoMode()) {
        setIsDemoMode(true);

        const store = useInventoryStore.getState();
        if (store.batches.length === 0) {
          await store.loadDemoData();
        }

        const inventoryProducts = store.getInventoryProducts();

        const mapped: ProductRow[] = inventoryProducts.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          categoryId: p.categoryId ?? p.category,
          unit: p.unit,
          unitLevels: p.unitLevels ?? [],
          barcode: p.barcode,
          defaultPrice: p.defaultPrice,
          defaultSellingPrice: p.defaultSellingPrice,
          description: p.description ?? null,
          requiresPrescription: p.requiresPrescription,
          minStock: p.minStock,
          totalStock: activeBranch
            ? p.batches.filter((b) => b.pharmacyId === activeBranch.id).reduce((s, b) => s + b.quantity, 0)
            : p.totalStock,
          isActive: p.isActive,
        }));

        setProducts(mapped);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
      toast.error("Gagal memuat daftar produk");
    } finally {
      setIsLoading(false);
    }
  }, [activeBranch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;

    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }

    if (!showInactive) {
      result = result.filter((p) => p.isActive);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [products, categoryFilter, showInactive, searchQuery]);

  const handleAdd = useCallback(() => {
    setEditingProduct(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((product: ProductRow) => {
    setEditingProduct(product);
    setShowForm(true);
  }, []);

  const handleToggleActive = useCallback(
    async (product: ProductRow) => {
      try {
        if (productRepo.isConnected) {
          await productRepo.updateProduct(product.id, {
            isActive: !product.isActive,
          });
        }

        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, isActive: !p.isActive } : p,
          ),
        );

        toast.success(
          product.isActive
            ? "Produk dinonaktifkan"
            : "Produk diaktifkan kembali",
        );
      } catch (err) {
        console.error("Failed to toggle product status:", err);
        toast.error("Gagal mengubah status produk");
      }
    },
    [],
  );

  const handleFormSaved = useCallback(() => {
    loadProducts();
  }, [loadProducts]);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingProduct(null);
  }, []);

  if (isLoading) {
    return (
      <Container>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Produk
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manajemen obat, alat kesehatan, dan suplemen
          </p>
        </div>
        <TableSkeleton rows={6} />
      </Container>
    );
  }

  if (products.length === 0) {
    return (
      <Container>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Produk
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manajemen obat, alat kesehatan, dan suplemen
          </p>
        </div>

        <EmptyState
          icon={<Pill className="h-7 w-7" />}
          title="Belum ada produk"
          description="Tambahkan produk pertama Anda. Semua obat, alat kesehatan, dan suplemen dikelola di sini."
          badge={isDemoMode ? "Mode Demo" : undefined}
        />

        {canEdit && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Tambah Produk
            </button>
          </div>
        )}

        <ProductFormModal
          open={showForm}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
          editingProduct={editingProduct}
        />
      </Container>
    );
  }

  return (
    <Container>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Produk
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {products.length} produk terdaftar
            {isDemoMode && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                Demo
              </span>
            )}
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600 transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Produk
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nama atau barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          <option value="">Semua Kategori</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={showInactive}
            onClick={() => setShowInactive((v) => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-100 focus:ring-offset-1",
              showInactive
                ? "bg-brand-500"
                : "bg-neutral-300 dark:bg-neutral-600",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                showInactive ? "translate-x-4" : "translate-x-0",
              )}
            />
          </button>
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
            Tampilkan Nonaktif
          </span>
        </label>
      </div>

      <ProductTable
        products={filtered}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
      />

      {filtered.length < products.length && (
        <p className="mt-3 text-[11px] text-neutral-400">
          Menampilkan {filtered.length} dari {products.length} produk
        </p>
      )}

      <div className="mt-4 flex items-center gap-4 text-[10px] text-neutral-400">
        <span>
          <kbd className="rounded border border-neutral-300 px-1 py-0.5 font-mono text-[9px] dark:border-neutral-600">
            Esc
          </kbd>{" "}
          Tutup form
        </span>
        <span>
          <kbd className="rounded border border-neutral-300 px-1 py-0.5 font-mono text-[9px] dark:border-neutral-600">
            Ctrl+Enter
          </kbd>{" "}
          Simpan
        </span>
      </div>

      <ProductFormModal
        open={showForm}
        onClose={handleFormClose}
        onSaved={handleFormSaved}
        editingProduct={editingProduct}
      />
    </Container>
  );
}
