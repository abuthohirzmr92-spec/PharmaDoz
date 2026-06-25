"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, AlertTriangle, Scan, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { generateProductCode, validateBarcode } from "@/lib/barcode-utils";
import { productRepo } from "@/lib/repository-instances";
import { MultiUnitEditor } from "@/components/products/multi-unit-editor";
import { isDemoMode } from "@/config/env";
import { toast } from "sonner";
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

import { BASE_UNITS, MIDDLE_UNITS, LARGE_UNITS } from "@/constants/unit-options";
import { DOSAGE_FORM_OPTIONS } from "@/constants/dosage-forms";
import { useLocationMasterStore } from "@/store/location-master-store";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

/** V3 P0.5 — prefill data dari Purchase Panel (create mode only) */
export interface ProductPrefillData {
  name?: string;
  unit?: string;
  defaultPrice?: number;
  defaultSellingPrice?: number;
  barcode?: string;
  rackLocation?: string;
}

export interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after successful save. Receives created/updated product for auto-relink (V3 P0.6) */
  onSaved: (product?: { id: string; name: string; unit: string }) => void;
  editingProduct?: ProductRow | null;
  /** Prefill form fields in create mode (ignored in edit mode) */
  prefillData?: ProductPrefillData;
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
  rackLocation: string;
  manufacturer: string;
  strength: string;
  dosageForm: string;
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
  rackLocation: "",
  manufacturer: "",
  strength: "",
  dosageForm: "",
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
  prefillData,
}: ProductFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [units, setUnits] = useState<string[]>(BASE_UNITS);
  const [isScanning, setIsScanning] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sellingPriceWarning, setSellingPriceWarning] = useState(false);
  // RC1 P0G.1 — location suggestions from master
  const locationMaster = useLocationMasterStore((s) => s.locations);
  const loadLocations = useLocationMasterStore((s) => s.loadLocations);
  useEffect(() => { if (open) loadLocations(); }, [open, loadLocations]);

  /* ---- V2 Multi Unit — Kemasan Menengah & Besar state ---- */
  const [level2Name, setLevel2Name] = useState("");
  const [level2Contains, setLevel2Contains] = useState<number | "">("");
  const [level3Name, setLevel3Name] = useState("");
  const [level3Contains, setLevel3Contains] = useState<number | "">("");
  const [unitLevelErrors, setUnitLevelErrors] = useState<string[]>([]);

  // Quick create category
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const newCategoryRef = useRef<HTMLInputElement>(null);
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
            setUnits(BASE_UNITS);
          }
        } catch {
          if (isDemoMode()) {
            setCategories(DEMO_CATEGORIES);
            setUnits(BASE_UNITS);
          }
        }
      } else if (isDemoMode()) {
        setCategories(DEMO_CATEGORIES);
        setUnits(BASE_UNITS);
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
        rackLocation: editingProduct.rackLocation ?? "",
        manufacturer: (editingProduct as any).manufacturer ?? "",
        strength: (editingProduct as any).strength ?? "",
        dosageForm: (editingProduct as any).dosageForm ?? "",
        description: editingProduct.description ?? "",
        isActive: editingProduct.isActive,
      });
    } else if (prefillData) {
      // V3 P0.5 — prefill from Purchase Panel
      setForm({
        ...EMPTY_FORM,
        name: prefillData.name ?? "",
        barcode: prefillData.barcode ?? "",
        unit: prefillData.unit ?? EMPTY_FORM.unit,
        defaultPrice: prefillData.defaultPrice ?? 0,
        defaultSellingPrice: prefillData.defaultSellingPrice ?? 0,
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setIsDirty(false);
    setErrors({});
    setUnitLevelErrors([]);
    setSellingPriceWarning(false);

    // V2 Multi Unit — populate unit levels when editing
    if (editingProduct) {
      productRepo.getUnitLevels(editingProduct.id).then((levels) => {
        const l2 = levels.find((l) => l.level === 2);
        const l3 = levels.find((l) => l.level === 3);
        setLevel2Name(l2?.unitName ?? "");
        setLevel2Contains(l2?.contains ?? "");
        setLevel3Name(l3?.unitName ?? "");
        setLevel3Contains(l3?.contains ?? "");
      }).catch(() => {
        setLevel2Name("");
        setLevel2Contains("");
        setLevel3Name("");
        setLevel3Contains("");
      });
    } else {
      setLevel2Name("");
      setLevel2Contains("");
      setLevel3Name("");
      setLevel3Contains("");
    }

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

    // V2 Multi Unit — validate unit levels
    const ulErrors: string[] = [];
    const baseUnit = form.unit.trim().toLowerCase();

    // Pre-extract values
    const l2n = level2Name.trim();
    const l2c = typeof level2Contains === "number" ? level2Contains : 0;
    const l3n = level3Name.trim();
    const l3c = typeof level3Contains === "number" ? level3Contains : 0;

    // Kemasan Menengah validation
    if (l2n) {
      if (l2n.toLowerCase() === baseUnit) {
        ulErrors.push(`Nama Kemasan Menengah tidak boleh sama dengan Satuan Dasar ("${form.unit}").`);
      }
      if (l2c <= 0) {
        ulErrors.push("Kemasan Menengah: isi harus lebih dari 0.");
      }
      if (l3n && l3n.toLowerCase() === l2n.toLowerCase()) {
        ulErrors.push("Kemasan Menengah dan Kemasan Besar tidak boleh memiliki nama unit yang sama.");
      }
    }

    // Kemasan Besar validation — only if Kemasan Menengah is filled
    if (l3n) {
      if (!l2n) {
        ulErrors.push("Kemasan Menengah harus diisi terlebih dahulu sebelum Kemasan Besar.");
      }
      if (l3n.toLowerCase() === baseUnit) {
        ulErrors.push(`Nama Kemasan Besar tidak boleh sama dengan Satuan Dasar ("${form.unit}").`);
      }
      if (l3c <= 0) {
        ulErrors.push("Kemasan Besar: isi harus lebih dari 0.");
      }
    }

    setUnitLevelErrors(ulErrors);
    return Object.keys(newErrors).length === 0 && ulErrors.length === 0;
  }, [form, level2Name, level2Contains, level3Name, level3Contains]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    // V2 Multi Unit — build unitLevels array from form state
    const unitLevels: import("@/types/unit").UnitLevel[] = [];
    const l2n = level2Name.trim();
    const l2c = typeof level2Contains === "number" ? level2Contains : 0;
    const l3n = level3Name.trim();
    const l3c = typeof level3Contains === "number" ? level3Contains : 0;

    if (l2n && l2c > 0) {
      unitLevels.push({ level: 2, unitName: l2n, contains: l2c });
    }
    if (l3n && l3c > 0 && unitLevels.length > 0) {
      unitLevels.push({ level: 3, unitName: l3n, contains: l3c });
    }

    let savedProduct: { id: string; name: string; unit: string } | undefined;

    try {
      if (productRepo.isConnected) {
        if (isEdit) {
          const updated = await productRepo.updateProduct(editingProduct!.id, {
            categoryId: form.categoryId || form.category,
            name: form.name.trim(),
            barcode: form.barcode.trim() || null,
            unit: form.unit,
            defaultPrice: form.defaultPrice,
            defaultSellingPrice: form.defaultSellingPrice,
            description: form.description.trim() || null,
            requiresPrescription: form.requiresPrescription,
            minStock: form.minStock,
            rackLocation: form.rackLocation.trim() || null,
            manufacturer: form.manufacturer.trim() || null,
            strength: form.strength.trim() || null,
            dosageForm: form.dosageForm.trim() || null,
            isActive: form.isActive,
            unitLevels: unitLevels.length > 0 ? unitLevels : undefined,
          });
          savedProduct = { id: updated.id, name: updated.name, unit: updated.unit ?? form.unit };
        } else {
          const created = await productRepo.createProduct({
            categoryId: form.categoryId,
            name: form.name.trim(),
            barcode: form.barcode.trim() || null,
            unit: form.unit,
            defaultPrice: form.defaultPrice,
            defaultSellingPrice: form.defaultSellingPrice,
            description: form.description.trim() || null,
            requiresPrescription: form.requiresPrescription,
            minStock: form.minStock,
            rackLocation: form.rackLocation.trim() || null,
            manufacturer: form.manufacturer.trim() || null,
            strength: form.strength.trim() || null,
            dosageForm: form.dosageForm.trim() || null,
            isActive: form.isActive,
            unitLevels: unitLevels.length > 0 ? unitLevels : undefined,
          });
          savedProduct = { id: created.id, name: created.name, unit: created.unit ?? form.unit };
        }
      }

      onSaved(savedProduct);
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

  /* ---- Quick create category ---- */
  const handleCreateCategory = useCallback(async () => {
    const name = newCategoryName.trim();
    if (!name || name.length < 2) return;
    setCreatingCategory(true);
    try {
      const cat = await productRepo.createCategory(name);
      const option: CategoryOption = { id: cat.id, name: cat.name };
      setCategories((prev) => [...prev, option]);
      updateField("categoryId", cat.id);
      updateField("category", cat.name);
      setShowNewCategory(false);
      setNewCategoryName("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membuat kategori",
      );
    } finally {
      setCreatingCategory(false);
    }
  }, [newCategoryName, updateField]);

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
            {showNewCategory ? (
              <div className="flex gap-2">
                <input
                  ref={newCategoryRef}
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nama kategori baru..."
                  disabled={creatingCategory}
                  className={cn(
                    "flex-1 rounded-lg border bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 dark:bg-neutral-800 dark:text-neutral-50",
                    errors.category
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-700"
                      : "border-neutral-200 focus:border-brand-400 focus:ring-brand-100 dark:border-neutral-700",
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCategory();
                    if (e.key === "Escape") setShowNewCategory(false);
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={creatingCategory || newCategoryName.trim().length < 2}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 transition disabled:opacity-50"
                >
                  {creatingCategory ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Simpan"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(false)}
                  disabled={creatingCategory}
                  className="rounded-lg px-2 py-2 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  Batal
                </button>
              </div>
            ) : (
              <select
                value={form.categoryId || form.category}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__new__") {
                    setShowNewCategory(true);
                    setNewCategoryName("");
                    setTimeout(() => newCategoryRef.current?.focus(), 50);
                    return;
                  }
                  const cat = categories.find((c) => c.id === val || c.name === val);
                  if (cat) {
                    updateField("categoryId", cat.id);
                    updateField("category", cat.name);
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
                <option disabled>──────────</option>
                <option value="__new__">
                  + Kategori Baru
                </option>
              </select>
            )}
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

          {/* Satuan Dasar (Level 1) */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              Satuan Dasar
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

          {/* ── V2 Multi Unit Editor ── */}
          <MultiUnitEditor
            baseUnit={form.unit}
            level2Name={level2Name}
            level2Contains={level2Contains}
            level3Name={level3Name}
            level3Contains={level3Contains}
            errors={unitLevelErrors}
            middleSuggestions={MIDDLE_UNITS.filter((u) => u !== form.unit)}
            largeSuggestions={LARGE_UNITS.filter((u) => u !== form.unit)}
            onLevel2NameChange={(v) => { setLevel2Name(v); setIsDirty(true); }}
            onLevel2ContainsChange={(v) => { setLevel2Contains(v); setIsDirty(true); }}
            onLevel3NameChange={(v) => { setLevel3Name(v); setIsDirty(true); }}
            onLevel3ContainsChange={(v) => { setLevel3Contains(v); setIsDirty(true); }}
          />

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

          {/* No Rak */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">No Rak</label>
            <input type="text" value={form.rackLocation}
              onChange={(e) => updateField("rackLocation", e.target.value)}
              placeholder="Contoh: R-A-03" list="location-suggestions"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50" />
          </div>

          {/* Manufacturer */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Manufacturer</label>
            <input type="text" value={form.manufacturer}
              onChange={(e) => updateField("manufacturer", e.target.value)}
              placeholder="Contoh: Kimia Farma" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Strength */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Strength</label>
              <input type="text" value={form.strength}
                onChange={(e) => updateField("strength", e.target.value)}
                placeholder="Contoh: 500 mg" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50" />
            </div>
            {/* Dosage Form */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Dosage Form</label>
              <select value={form.dosageForm}
                onChange={(e) => updateField("dosageForm", e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50">
                <option value="">Pilih...</option>
                {DOSAGE_FORM_OPTIONS.map(df => <option key={df} value={df}>{df}</option>)}
              </select>
            </div>
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

          {/* Location suggestions datalist */}
          {locationMaster.length > 0 && (
            <datalist id="location-suggestions">
              {locationMaster.filter(l => l.isActive).map(l => (
                <option key={l.id} value={l.name} />
              ))}
            </datalist>
          )}

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
