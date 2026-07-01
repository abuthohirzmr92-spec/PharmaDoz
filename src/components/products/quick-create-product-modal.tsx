"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Check } from "lucide-react";
import { toast } from "sonner";
import { generateProductCode } from "@/lib/barcode-utils";
import { useProductStore } from "@/store/product-store";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { NumericInput } from "@/components/shared/numeric-input";
import { BASE_UNITS } from "@/constants/unit-options";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface QuickCreateProductModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: {
    id: string;
    name: string;
    defaultPrice: number;
    defaultSellingPrice: number;
    unit: string;
  }) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEMO_CATEGORIES = [
  "Obat Bebas",
  "Obat Bebas Terbatas",
  "Obat Keras",
  "Alat Kesehatan",
  "Kosmetik",
  "Suplemen",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function QuickCreateProductModal({
  open,
  onClose,
  onCreated,
}: QuickCreateProductModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [barcode, setBarcode] = useState("");
  const [defaultPrice, setDefaultPrice] = useState(0);
  const [defaultSellingPrice, setDefaultSellingPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Inline category creation
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [categories, setCategories] = useState<string[]>(
    checkDemoMode() ? DEMO_CATEGORIES : [],
  );
  const [units, setUnits] = useState<string[]>(
    checkDemoMode() ? BASE_UNITS : [],
  );
  const categoryIdMapRef = useRef<Map<string, string>>(new Map());
  const nameRef = useRef<HTMLInputElement>(null);

  /* ---- Load categories/units from DB when connected ---- */
  useEffect(() => {
    if (!open) return;

    const fetchLookups = async () => {
      if (useProductStore.getState().isConnected) {
        try {
          const [cats, unitRows] = await Promise.all([
            useProductStore.getState().loadCategories(),
            useProductStore.getState().loadUnits(),
          ]);

          if (cats.length > 0) {
            categoryIdMapRef.current = new Map(
              cats.map((c) => [c.name, c.id]),
            );
            setCategories(cats.map((c) => c.name));
          }

          if (unitRows.length > 0) {
            setUnits(unitRows.map((u) => u.name));
          }
        } catch {
          // Fall back to hardcoded values
        }
      }
    };

    fetchLookups();
  }, [open]);

  /* ---- Reset form when opening ---- */
  useEffect(() => {
    if (!open) return;

    setName("");
    setCategory("");
    setUnit("");
    setBarcode("");
    setDefaultPrice(0);
    setDefaultSellingPrice(0);
    setIsSubmitting(false);
    setError("");
    setShowNewCategory(false);
    setNewCategoryName("");

    const timer = setTimeout(() => nameRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [open]);

  /* ---- Auto barcode ---- */
  const handleAutoBarcode = useCallback(() => {
    setBarcode(generateProductCode());
  }, []);

  /* ---- Submit ---- */
  const handleSubmit = useCallback(async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError("Nama produk minimal 2 karakter");
      return;
    }
    if (!category) {
      setError("Pilih kategori produk");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      if (useProductStore.getState().isConnected) {
        const categoryId =
          categoryIdMapRef.current.get(category) || category;

        const created = await useProductStore.getState().createProduct({
          categoryId,
          name: name.trim(),
          barcode: barcode.trim() || null,
          unit: unit || "Pcs",
          defaultPrice,
          defaultSellingPrice,
        });

        toast.success("Produk baru ditambahkan");
        onCreated({
          id: created.id,
          name: created.name,
          defaultPrice: created.defaultPrice ?? 0,
          defaultSellingPrice: created.defaultSellingPrice ?? 0,
          unit: created.unit ?? unit,
        });
      } else {
        const newProduct = {
          id: `prd-${Date.now()}`,
          name: name.trim(),
          defaultPrice,
          defaultSellingPrice,
          unit: unit || "Pcs",
        };

        toast.success("Produk baru ditambahkan");
        onCreated(newProduct);
      }

      onClose();
    } catch (err) {
      console.error("Quick create product failed:", err);
      toast.error("Gagal membuat produk");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, category, unit, barcode, defaultPrice, defaultSellingPrice, onCreated, onClose]);

  /* ---- Keyboard ---- */
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleSubmit, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className="mx-4 w-full max-w-sm rounded-xl bg-white shadow-xl dark:bg-neutral-900 p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Buat Produk Baru
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-3">
          {/* Nama Produk */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              Nama Produk <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
              placeholder="Masukkan nama produk"
              autoFocus
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewCategory(true);
                } else {
                  setCategory(e.target.value);
                  setShowNewCategory(false);
                }
              }}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            >
              <option value="">Pilih kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option disabled>──────────</option>
              <option value="__new__">+ Tambah Kategori</option>
            </select>

            {/* Inline new category form */}
            {showNewCategory && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 p-2 dark:border-brand-800 dark:bg-brand-950">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nama kategori baru"
                  className="flex-1 rounded border border-brand-300 bg-white px-2 py-1 text-sm focus:border-brand-500 focus:outline-none dark:border-brand-700 dark:bg-neutral-900 dark:text-neutral-50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (async () => {
                        const name = newCategoryName.trim();
                        if (!name) { toast.error("Nama kategori wajib diisi."); return; }
                        if (categories.includes(name)) { toast.error("Kategori sudah ada."); return; }
                        setCreatingCategory(true);
                        try {
                          if (useProductStore.getState().isConnected) await useProductStore.getState().createCategory(name);
                          setCategories((prev) => [...prev, name]);
                          setCategory(name);
                          setShowNewCategory(false);
                          setNewCategoryName("");
                          toast.success(`Kategori "${name}" ditambahkan.`);
                        } catch { toast.error("Gagal membuat kategori."); }
                        finally { setCreatingCategory(false); }
                      })();
                    }
                    if (e.key === "Escape") { setShowNewCategory(false); setNewCategoryName(""); }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  disabled={creatingCategory || !newCategoryName.trim()}
                  onClick={async () => {
                    const name = newCategoryName.trim();
                    if (!name) { toast.error("Nama kategori wajib diisi."); return; }
                    if (categories.includes(name)) { toast.error("Kategori sudah ada."); return; }
                    setCreatingCategory(true);
                    try {
                      if (useProductStore.getState().isConnected) await useProductStore.getState().createCategory(name);
                      setCategories((prev) => [...prev, name]);
                      setCategory(name);
                      setShowNewCategory(false);
                      setNewCategoryName("");
                      toast.success(`Kategori "${name}" ditambahkan.`);
                    } catch { toast.error("Gagal membuat kategori."); }
                    finally { setCreatingCategory(false); }
                  }}
                  className="shrink-0 rounded bg-brand-600 p-1.5 text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Satuan */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              Satuan
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            >
              <option value="">Pilih satuan</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Barcode */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              Barcode
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                placeholder="Scan atau masukkan barcode"
              />
              <button
                type="button"
                onClick={handleAutoBarcode}
                className="shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-[11px] font-medium text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
              >
                Auto
              </button>
            </div>
          </div>

          {/* Harga Beli & Harga Jual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Harga Beli
              </label>
              <NumericInput
                value={defaultPrice}
                onChange={setDefaultPrice}
                min={0}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Harga Jual
              </label>
              <NumericInput
                value={defaultSellingPrice}
                onChange={setDefaultSellingPrice}
                min={0}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan & Pilih"}
          </button>
        </div>
      </div>
    </div>
  );
}
