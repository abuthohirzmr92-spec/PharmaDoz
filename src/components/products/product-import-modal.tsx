"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { X, Download, Upload, Check, AlertTriangle, Loader2, RefreshCw, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { productRepo, supplierRepo } from "@/lib/repository-instances";
import { parseProductRows, generateTemplateWorkbook, type ImportedProductRow, type ParseError } from "@/lib/import/excel-product-parser";
import { logActivity } from "@/lib/audit/activity-logger";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  existingNames: Set<string>;
  existingBarcodes: Set<string>;
  categories: string[];
}

type RowAction = "create" | "update" | "skip";
type UpdateMode = "safe_price" | "full_overwrite"; // "full_overwrite" is now "extended" in UI

interface ResolvedRow {
  row: ImportedProductRow;
  action: RowAction;
  existingProductId?: string;
  reason: string;
}

export function ProductImportModal({ open, onClose, onImported, existingNames, existingBarcodes, categories }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportedProductRow[] | null>(null);
  const [resolved, setResolved] = useState<ResolvedRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [step, setStep] = useState<"upload" | "resolve" | "confirm" | "importing" | "done">("upload");
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<{ created: number; updated: number; skipped: number; failed: number } | null>(null);

  // RC1 P0C — update mode
  const [updateMode, setUpdateMode] = useState<UpdateMode>("safe_price");

  // RC1 P0C — pre-build caches before import
  const [existingProductCache, setExistingProductCache] = useState<Map<string, string>>(new Map()); // name→id
  const [existingBarcodeCache, setExistingBarcodeCache] = useState<Map<string, string>>(new Map()); // barcode→id

  // Load product cache on open
  useEffect(() => {
    if (open && productRepo.isConnected) {
      productRepo.getRawProducts({ isActive: true }).then(prods => {
        const nameMap = new Map<string, string>();
        const barcodeMap = new Map<string, string>();
        for (const p of prods) {
          if (p.name) nameMap.set(p.name.trim().toLowerCase(), p.id);
          if (p.barcode) barcodeMap.set(p.barcode.trim(), p.id);
        }
        setExistingProductCache(nameMap);
        setExistingBarcodeCache(barcodeMap);
      }).catch(() => {});
    }
  }, [open]);

  // RC1 P0C — Duplicate matrix with existingProductId
  const applyResolutions = useCallback((rows: ImportedProductRow[]): ResolvedRow[] => {
    return rows.map(r => {
      const normName = r.namaProduk.trim().toLowerCase();
      const barcode = r.barcode?.trim();
      // Same barcode → skip (highest priority)
      if (barcode && existingBarcodeCache.has(barcode)) {
        return { row: r, action: "skip", existingProductId: existingBarcodeCache.get(barcode), reason: `Barcode ${barcode} sudah digunakan` };
      }
      // Same name → update
      if (existingProductCache.has(normName)) {
        return { row: r, action: "update", existingProductId: existingProductCache.get(normName), reason: "Nama produk sudah ada — akan diupdate" };
      }
      return { row: r, action: "create", reason: "Produk baru" };
    });
  }, [existingProductCache, existingBarcodeCache]);

  // Apply when product cache loads or rows change
  useEffect(() => {
    if (parsedRows && existingProductCache.size > 0) {
      setResolved(applyResolutions(parsedRows));
    }
  }, [parsedRows, existingProductCache, applyResolutions]);

  const createCount = resolved?.filter(r => r.action === "create").length ?? 0;
  const updateCount = resolved?.filter(r => r.action === "update").length ?? 0;
  const skipCount = resolved?.filter(r => r.action === "skip").length ?? 0;

  const handleDownload = useCallback(async () => {
    try {
      const data = await generateTemplateWorkbook();
      const blob = new Blob([data as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "MasterProduk_Template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Template berhasil diunduh.");
    } catch { toast.error("Gagal membuat template."); }
  }, []);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    try {
      const { read, utils } = await import("xlsx");
      const buffer = await f.arrayBuffer();
      const wb = read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      if (!sheet) { toast.error("Sheet tidak ditemukan."); return; }
      const data = utils.sheet_to_json<string[]>(sheet, { header: 1 }) as (string | number | null | undefined)[][];
      const { rows, errors } = parseProductRows(data);
      setParseErrors(errors);
      if (errors.length > 0 && rows.length === 0) {
        toast.error(`Gagal parsing: ${errors.length} error.`);
        return;
      }
      setParsedRows(rows);
      setResolved(applyResolutions(rows));
      setStep("resolve");
    } catch { toast.error("Gagal membaca file Excel."); }
  }, [applyResolutions]);

  const handleImport = useCallback(async () => {
    if (!resolved) return;
    setIsImporting(true);
    setStep("importing");
    const startTime = Date.now();
    let created = 0, updated = 0, skipped = 0, failed = 0;

    // RC1 P0D — Pre-build category ID cache (UUID safety)
    const categoryMap = new Map<string, string>(); // name→id
    try {
      const allCats = await productRepo.getCategories();
      for (const c of allCats) { categoryMap.set(c.name.trim().toLowerCase(), c.id); }
    } catch { /* best-effort */ }
    // Create missing categories (each unique name once)
    const pendingCategories = new Set<string>();
    for (const { row, action } of resolved) {
      if (action === "skip") continue;
      const cat = row.kategori.trim();
      if (!categoryMap.has(cat.toLowerCase())) pendingCategories.add(cat);
    }
    for (const catName of pendingCategories) {
      try {
        const cat = await productRepo.createCategory(catName);
        categoryMap.set(catName.toLowerCase(), cat.id);
      } catch { /* best-effort */ }
    }

    for (const { row, action, existingProductId } of resolved) {
      if (action === "skip") { skipped++; continue; }
      try {
        // RC1 P0D — Category safety: UUID from pre-built cache
        const catLower = row.kategori.trim().toLowerCase();
        const categoryId = categoryMap.get(catLower);
        if (!categoryId) { failed++; continue; } // No valid UUID → skip

        // Build unitLevels
        const unitLevels: import("@/types/unit").UnitLevel[] = [];
        if (row.middleUnit && row.middleQty && row.middleQty > 0) {
          unitLevels.push({ level: 2, unitName: row.middleUnit, contains: row.middleQty });
        }
        if (row.largeUnit && row.largeQty && row.largeQty > 0 && unitLevels.length > 0) {
          unitLevels.push({ level: 3, unitName: row.largeUnit, contains: row.largeQty });
        }

        const rackLocation = row.nomorRak
          ? `${row.lokasiRak || ""} ${row.nomorRak}`.trim() || null
          : null;

        if (action === "update" && existingProductId) {
          const updateData: Record<string, unknown> = {};
          // RC1 P0C — Safe mode: price + rack + min stock only
          if (row.hargaJualDasar != null) updateData.defaultSellingPrice = row.hargaJualDasar;
          if (row.minimalStok != null) updateData.minStock = row.minimalStok;
          if (rackLocation) updateData.rackLocation = rackLocation;
          // Full overwrite mode: also update unit + unitLevels
          if (updateMode === "full_overwrite") {
            if (row.baseUnit) updateData.unit = row.baseUnit;
            if (unitLevels.length > 0) updateData.unitLevels = unitLevels;
          }
          await productRepo.updateProduct(existingProductId, updateData);
          updated++;
        } else {
          const createdProduct = await productRepo.createProduct({
            categoryId,
            name: row.namaProduk.trim(),
            barcode: row.barcode?.trim() || null,
            unit: row.baseUnit,
            defaultPrice: 0,
            defaultSellingPrice: row.hargaJualDasar ?? 0,
            minStock: row.minimalStok ?? 0,
            rackLocation,
            manufacturer: row.manufacturer || null,
            strength: row.strength || null,
            dosageForm: row.dosageForm || null,
            unitLevels: unitLevels.length > 0 ? unitLevels : undefined,
          });
          // RC1 P0D — refresh cache for same-session duplicate prevention
          existingProductCache.set(createdProduct.name.trim().toLowerCase(), createdProduct.id);
          if (createdProduct.barcode) existingBarcodeCache.set(createdProduct.barcode.trim(), createdProduct.id);
          created++;
        }
      } catch { failed++; }
    }

    const durationMs = Date.now() - startTime;
    setResults({ created, updated, skipped, failed });
    setStep("done");

    logActivity({
      action: "product.import_excel",
      resourceType: "product",
      resourceId: null,  // Bulk import — no single product UUID
      reference: file?.name ?? "unknown",
      metadata: { filename: file?.name, totalRows: resolved.length, createdRows: created, updatedRows: updated, skippedRows: skipped, failedRows: failed, durationMs, updateMode },
    }).catch(() => {});

    setIsImporting(false);
    onImported();
  }, [resolved, categories, file, onImported, updateMode]);

  const handleReset = useCallback(() => {
    setFile(null); setParsedRows(null); setResolved(null); setParseErrors([]); setResults(null); setStep("upload");
  }, []);

  if (!open) return null;

  // RC1 P0B — Dry run summary
  const showConfirm = step === "confirm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-neutral-900 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Import Produk dari Excel</h2>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5">
          {/* Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <button onClick={handleDownload} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-400">
                <Download className="h-4 w-4" /> Download Template Excel (v2)
              </button>
              <div className="rounded-lg border-2 border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
                <Upload className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Pilih file Excel (.xlsx)</p>
                <input type="file" accept=".xlsx" onChange={handleFile} className="mt-3 text-sm" />
              </div>
            </div>
          )}

          {/* Resolve: show validation results */}
          {step === "resolve" && resolved && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium text-neutral-700">{resolved.length} baris diproses</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{createCount}</p>
                  <p className="text-[10px] text-green-600">Produk Baru</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{updateCount}</p>
                  <p className="text-[10px] text-blue-600">Update</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{skipCount}</p>
                  <p className="text-[10px] text-amber-600">Dilewati</p>
                </div>
              </div>

              {parseErrors.length > 0 && (
                <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
                  <p className="text-xs font-medium text-red-700">Error Parsing ({parseErrors.length}):</p>
                  {parseErrors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-[10px] text-red-600">Baris {e.rowNumber}: {e.field} — {e.message}</p>
                  ))}
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {resolved.slice(0, 100).map((r, i) => (
                  <div key={i} className={cn("flex items-center gap-2 rounded px-2 py-1 text-xs",
                    r.action === "create" ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" :
                    r.action === "update" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" :
                    "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400")}>
                    {r.action === "skip" ? <SkipForward className="h-3 w-3" /> :
                     r.action === "update" ? <RefreshCw className="h-3 w-3" /> :
                     <Check className="h-3 w-3" />}
                    <span className="truncate">{r.row.namaProduk}</span>
                    <span className="text-[10px] opacity-70 shrink-0">({r.reason})</span>
                  </div>
                ))}
                {resolved.length > 100 && <p className="text-xs text-neutral-400 px-2">...dan {resolved.length - 100} lainnya</p>}
              </div>

              <div className="flex gap-2">
                <button onClick={handleReset} className="flex-1 rounded-lg border px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400">Batal</button>
                <button onClick={() => setStep("confirm")} disabled={createCount + updateCount === 0}
                  className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  Lanjutkan ({createCount + updateCount} produk)
                </button>
              </div>
            </div>
          )}

          {/* Confirm: dry run summary */}
          {step === "confirm" && resolved && (
            <div className="space-y-4">
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/20">
                <h3 className="text-sm font-semibold text-brand-800 dark:text-brand-200">Konfirmasi Import</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-neutral-500">Total Baris:</span> <span className="font-medium">{resolved.length}</span></div>
                  <div><span className="text-neutral-500">File:</span> <span className="font-medium truncate">{file?.name}</span></div>
                  <div><span className="text-green-600 font-medium">{createCount} produk baru</span></div>
                  <div><span className="text-blue-600 font-medium">{updateCount} update</span></div>
                  <div><span className="text-amber-600 font-medium">{skipCount} dilewati</span></div>
                  <div><span className="text-red-600 font-medium">{parseErrors.length} error</span></div>
                </div>
              </div>
              {/* RC1 P0C — Update mode selector */}
              {updateCount > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Mode Update ({updateCount} produk):</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setUpdateMode("safe_price")}
                      className={cn("flex-1 rounded px-3 py-1.5 text-xs font-medium border",
                        updateMode === "safe_price" ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400" : "border-neutral-200 text-neutral-500")}>
                      🛡️ Safe (harga + rak + stok min)
                    </button>
                    <button
                      onClick={() => setUpdateMode("full_overwrite")}
                      className={cn("flex-1 rounded px-3 py-1.5 text-xs font-medium border",
                        updateMode === "full_overwrite" ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" : "border-neutral-200 text-neutral-500")}>
                      📦 Extended (+unit, level, barcode)
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-neutral-500">
                Kategori baru otomatis dibuat (1× per kategori). Duplikat nama → update. Duplikat barcode → skip.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setStep("resolve")} className="flex-1 rounded-lg border px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400">← Kembali</button>
                <button onClick={handleImport} className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700">
                  Import {createCount + updateCount} Produk
                </button>
              </div>
            </div>
          )}

          {/* Importing */}
          {step === "importing" && (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-brand-600" />
              <p className="text-sm text-neutral-600">Mengimpor {createCount + updateCount} produk...</p>
            </div>
          )}

          {/* Done */}
          {step === "done" && results && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950/30">
                <Check className="mx-auto mb-2 h-8 w-8 text-green-600" />
                <p className="text-lg font-bold text-green-700 dark:text-green-400">Import Selesai</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center text-sm">
                <div className="rounded bg-green-100 p-2 dark:bg-green-950/30"><span className="font-bold text-green-700">{results.created}</span><br /><span className="text-xs">Dibuat</span></div>
                <div className="rounded bg-blue-100 p-2 dark:bg-blue-950/30"><span className="font-bold text-blue-700">{results.updated}</span><br /><span className="text-xs">Diupdate</span></div>
                <div className="rounded bg-amber-100 p-2 dark:bg-amber-950/30"><span className="font-bold text-amber-700">{results.skipped}</span><br /><span className="text-xs">Dilewati</span></div>
                <div className="rounded bg-red-100 p-2 dark:bg-red-950/30"><span className="font-bold text-red-700">{results.failed}</span><br /><span className="text-xs">Gagal</span></div>
              </div>
              <button onClick={handleReset} className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                Import Lagi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
