"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, AlertTriangle, Scan } from "lucide-react";
import { cn } from "@/lib/cn";
import { generateProductCode, validateBarcode } from "@/lib/barcode-utils";
import { productRepo } from "@/lib/repository-instances";
import { isDemoMode } from "@/config/env";
import type { ProductRow } from "./product-table";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

interface CategoryOption {
  id: string;
  name: string;
}

const DEMO_CATEGORIES: CategoryOption[] = [
  { id: "demo-obat-bebas", name: "Obat Bebas" },
  { id: "demo-obat-terbatas", name: "Obat Bebas Terbatas" },
  { id: "demo-obat-keras", name: "Obat Keras" },
  { id: "demo-antibiotik", name: "Antibiotik" },
  { id: "demo-alkes", name: "Alat Kesehatan" },
  { id: "demo-kosmetik", name: "Kosmetik" },
  { id: "demo-suplemen", name: "Suplemen" },
  { id: "demo-vitamin", name: "Vitamin" },
  { id: "demo-lainnya", name: "Lainnya" },
];

const DEMO_UNITS = [
  "Tablet",
  "Botol",
  "Strip",
  "Sachet",
  "Tube",
  "Pcs",
  "Kapsul",
  "Vial",
  "Ampul",
  "Suppositoria",
  "Inhaler",
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingProduct?: ProductRow | null;
}

/* ------------------------------------------------------------------ */
/*  Form State                                                         */
/* ------------------------------------------------------------------ */

interface FormState {
  name: string;
  category: string;
  categoryId: string;
  barcode: string;
  unit: string;
  defaultPrice: number;
  defaultSellingPrice: number;
  requiresPrescription: boolean;
  minStock: number;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  categoryId: "",
  barcode: "",
  unit: "Tablet",
  defaultPrice: 0,
  defaultSellingPrice: 0,
  requiresPrescription: false,
  minStock: 0,
  description: "",
  isActive: true,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ProductFormModal({
  open,
  onClose,
  onSaved,
  editingProduct,
}: ProductFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [units, setUnits] = useState<string[]>(DEMO_UNITS);
  const [isScanning, setIsScanning] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sellingPriceWarning, setSellingPriceWarning] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const isEdit = !!editingProduct;

  /* ---- Load categories/units from DB when connected ---- */
  useEffect(() => {
    if (!open) return;

    const fetchLookups = async () => {
      if (productRepo.isConnected) {
        try {
          const [cats, unitRows] = await Promise.all([
            productRepo.getCategories(),
            productRepo.getUnits(),
          ]);

          if (cats.length > 0) {
            setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
          } else if (isDemoMode()) {
            setCategories(DEMO_CATEGORIES);
          }

          if (unitRows.length > 0) {
            setUnits(unitRows.map((u) => u.name));
          } else if (isDemoMode()) {
            setUnits(DEMO_UNITS);
          }
        } catch {
          if (isDemoMode()) {
            setCategories(DEMO_CATEGORIES);
            setUnits(DEMO_UNITS);
          }
        }
      } else if (isDemoMode()) {
        setCategories(DEMO_CATEGORIES);
        setUnits(DEMO_UNITS);
      }
    };

    fetchLookups();
  }, [open]);

  /* ---- Populate form when editing ---- */
  useEffect(() => {
    if (!open) return;

    if (editingProduct) {
      setForm({
        name: editingProduct.name,
        category: editingProduct.category,
        categoryId: editingProduct.categoryId,
        barcode: editingProduct.barcode ?? "",
        unit: editingProduct.unit,
        defaultPrice: editingProduct.defaultPrice,
        defaultSellingPrice: editingProduct.defaultSellingPrice,
        requiresPrescription: editingProduct.requiresPrescription,
        minStock: editingProduct.minStock,
        description: editingProduct.description ?? "",
        isActive: editingProduct.isActive,
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setIsDirty(false);
    setErrors({});
    setSellingPriceWarning(false);

    // Focus name field after modal opens
    const timer = setTimeout(() => nameRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [open, editingProduct]);

  /* ---- Selling price warning ---- */
  useEffect(() => {
    if (form.defaultSellingPrice > 0 && form.defaultPrice > 0) {
      setSellingPriceWarning(form.defaultSellingPrice < form.defaultPrice);
    } else {
      setSellingPriceWarning(false);
    }
  }, [form.defaultSellingPrice, form.defaultPrice]);

  /* ---- Handlers ---- */
  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
      if (errors[key]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [errors],
  );

  const handleAutoBarcode = useCallback(() => {
    const code = generateProductCode();
    updateField("barcode", code);
  }, [updateField]);

  const handleBarcodeBlur = useCallback(() => {
    if (form.barcode.trim()) {
      const validation = validateBarcode(form.barcode);
      if (!validation.valid) {
        setErrors((prev) => ({
          ...prev,
          barcode: validation.message ?? "Barcode tidak valid",
        }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.barcode;
          return next;
        });
      }
    }
  }, [form.barcode]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Nama produk wajib diisi";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Nama produk minimal 2 karakter";
    }

    if (!form.category) {
      newErrors.category = "Kategori wajib dipilih";
    }

    if (form.barcode.trim()) {
      const validation = validateBarcode(form.barcode);
      if (!validation.valid) {
        newErrors.barcode = validation.message ?? "Barcode tidak valid";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (productRepo.isConnected) {
        if (isEdit) {
          await productRepo.updateProduct(editingProduct!.id, {
            categoryId: form.categoryId || form.category,
            name: form.name.trim(),
            barcode: form.barcode.trim() || null,
            unit: form.unit,
            defaultPrice: form.defaultPrice,
            defaultSellingPrice: form.defaultSellingPrice,
            description: form.description.trim() || null,
            requiresPrescription: form.requiresPrescription,
            minStock: form.minStock,
            isActive: form.isActive,
          });
        } else {
          await productRepo.createProduct({
            categoryId: form.categoryId,
            name: form.name.trim(),
            barcode: form.barcode.trim() || null,
            unit: form.unit,
            defaultPrice: form.defaultPrice,
            defaultSellingPrice: form.defaultSellingPrice,
            description: form.description.trim() || null,
            requiresPrescription: form.requiresPrescription,
            minStock: form.minStock,
            isActive: form.isActive,
          });
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save product:", err);
      const msg = err instanceof Error ? err.message : "Gagal menyimpan produk. Silakan coba lagi.";
      setErrors((prev) => ({
        ...prev,
        _general: msg,
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, isEdit, editingProduct, form, onSaved, onClose]);

  /* ---- Close confirmation ---- */
  const handleOverlayClick = useCallback(() => {
    if (isDirty) {
      if (!window.confirm("Perubahan yang belum disimpan akan hilang. Lanjutkan?")) return;
    }
    onClose();
  }, [isDirty, onClose]);

  /* ---- Keyboard ---- */
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleOverlayClick();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleOverlayClick, handleSubmit]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleOverlayClick();
      }}
    >
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-neutral-900 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {isEdit ? "Edit Produk" : "Tambah Produk"}
          </h2>
          <button
            onClick={() => handleOverlayClick()}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 px-5 py-4">
          {/* General error */}
          {errors._general && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {errors._general}
            </div>
          )}

          {/* Nama Produk */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              Nama Produk <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={cn(
                "w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 dark:bg-neutral-800 dark:text-neutral-50",
                errors.name
                  ? "border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-700"
                  : "border-neutral-200 focus:border-brand-400 focus:ring-brand-100 dark:border-neutral-700",
              )}
              placeholder="Masukkan nama produk"
              minLength={2}
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-[10px] text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Kategori */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              value={form.categoryId || form.category}
              onChange={(e) => {
                const val = e.target.value;
                const cat = categories.find((c) => c.id === val || c.name === val);
                if (cat) {
                  updateField("categoryId", cat.id);
                  updateField("category", cat.name);
                } else {
                  updateField("category", val);
                }
              }}
              className={cn(
                "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 dark:bg-neutral-800 dark:text-neutral-50",
                errors.category
                  ? "border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-700"
                  : "border-neutral-200 focus:border-brand-400 focus:ring-brand-100 dark:border-neutral-700",
              )}
            >
              <option value="">Pilih kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-[10px] text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Barcode */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              Barcode
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => updateField("barcode", e.target.value)}
                onBlur={handleBarcodeBlur}
                className={cn(
                  "flex-1 rounded-lg border bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 dark:bg-neutral-800 dark:text-neutral-50",
                  errors.barcode
                    ? "border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-700"
                    : "border-neutral-200 focus:border-brand-400 focus:ring-brand-100 dark:border-neutral-700",
                )}
                placeholder="Scan atau masukkan barcode"
              />
              <button
                type="button"
                onClick={handleAutoBarcode}
                className="shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-[11px] font-medium text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
              >
                Auto
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsScanning(true);
                  try {
                    // @ts-expect-error — BarcodeDetector API (Chrome 88+)
                    if (typeof BarcodeDetector !== "undefined") {
                      // @ts-expect-error
                      const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a"] });
                      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                      const video = document.createElement("video");
                      video.srcObject = stream;
                      video.setAttribute("playsinline", "true");
                      await video.play();
                      const scan = async () => {
                        const barcodes = await detector.detect(video);
                        if (barcodes.length > 0) {
                          updateField("barcode", barcodes[0].rawValue);
                          stream.getTracks().forEach((t) => t.stop());
                          video.remove();
                          setIsScanning(false);
                        } else {
                          requestAnimationFrame(scan);
                        }
                      };
                      // Auto-stop after 15 seconds
                      setTimeout(() => {
                        stream.getTracks().forEach((t) => t.stop());
                        video.remove();
                        if (isScanning) setIsScanning(false);
                      }, 15000);
                      scan();
                    } else {
                      alert("Browser tidak mendukung Barcode Scanner. Gunakan Chrome di Android atau masukkan barcode manual.");
                      setIsScanning(false);
                    }
                  } catch {
                    alert("Gagal mengakses kamera. Pastikan izin kamera diaktifkan.");
                    setIsScanning(false);
                  }
                }}
                disabled={isScanning}
                className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3 text-[11px] font-medium text-brand-600 hover:bg-brand-100 disabled:opacity-50 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900 transition-colors"
              >
                {isScanning ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-brand-500" />
                    Scan...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Scan className="h-3.5 w-3.5" />
                    Scan
                  </span>
                )}
              </button>
            </div>
            {errors.barcode && (
              <p className="mt-1 text-[10px] text-red-500">{errors.barcode}</p>
            )}
          </div>

          {/* Satuan */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              Satuan
            </label>
            <select
              value={form.unit}
              onChange={(e) => updateField("unit", e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Harga Beli & Harga Jual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Harga Beli Default
              </label>
              <input
                type="number"
                min={0}
                value={form.defaultPrice || ""}
                onChange={(e) =>
                  updateField("defaultPrice", Math.max(0, Number(e.target.value)))
                }
                placeholder="0"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Harga Jual Default
              </label>
              <input
                type="number"
                min={0}
                value={form.defaultSellingPrice || ""}
                placeholder="0"
                onChange={(e) =>
                  updateField(
                    "defaultSellingPrice",
                    Math.max(0, Number(e.target.value)),
                  )
                }
                className={cn(
                  "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 dark:bg-neutral-800 dark:text-neutral-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  sellingPriceWarning
                    ? "border-amber-300 focus:border-amber-400 focus:ring-amber-100 dark:border-amber-700"
                    : "border-neutral-200 focus:border-brand-400 focus:ring-brand-100 dark:border-neutral-700",
                )}
              />
            </div>
          </div>
          {sellingPriceWarning && (
            <p className="flex items-center gap-1 text-[10px] text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Harga jual lebih rendah dari harga beli
            </p>
          )}

          {/* Stok Minimum */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              Stok Minimum
            </label>
            <input
              type="number"
              min={0}
              value={form.minStock || ""}
              placeholder="0"
              onChange={(e) =>
                updateField("minStock", Math.max(0, Number(e.target.value)))
              }
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Toggles row */}
          <div className="flex items-center gap-6">
            {/* Resep Dokter */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Resep Dokter
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={form.requiresPrescription}
                onClick={() =>
                  updateField("requiresPrescription", !form.requiresPrescription)
                }
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-100 focus:ring-offset-1",
                  form.requiresPrescription
                    ? "bg-brand-500"
                    : "bg-neutral-300 dark:bg-neutral-600",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                    form.requiresPrescription ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </button>
            </label>

            {/* Status Aktif */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Status Aktif
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => updateField("isActive", !form.isActive)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-100 focus:ring-offset-1",
                  form.isActive
                    ? "bg-brand-500"
                    : "bg-neutral-300 dark:bg-neutral-600",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                    form.isActive ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </button>
            </label>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 resize-none"
              placeholder="Opsional"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
          <button
            onClick={() => handleOverlayClick()}
            disabled={isSubmitting}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
