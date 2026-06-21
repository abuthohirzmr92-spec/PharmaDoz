"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  PlusCircle,
  X,
  ScanLine,
  Upload,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useInventoryStore } from "@/store/inventory-store";
import type { PurchaseStatus, PurchaseItem, PurchaseInvoice } from "@/types/inventory";
import { cn } from "@/lib/cn";
import { usePermission } from "@/hooks/use-auth";
import { productRepo, supplierRepo } from "@/lib/repository-instances";
import { useWalletStore } from "@/store/wallet-store";
import { QuickCreateProductModal } from "@/components/products/quick-create-product-modal";
import { InventoryPayInvoiceModal } from "./inventory-pay-invoice-modal";
import { Loader2 } from "lucide-react";

const STATUS_FILTERS: { label: string; value: PurchaseStatus | "all" }[] = [
  { label: "Semua", value: "all" },
  { label: "Lunas", value: "paid" },
  { label: "Sebagian", value: "partial" },
  { label: "Belum", value: "unpaid" },
];

const STATUS_STYLE: Record<PurchaseStatus, { icon: typeof CheckCircle; cls: string; label: string }> = {
  paid: { icon: CheckCircle, cls: "text-green-600 bg-green-50 dark:bg-green-950/30", label: "Lunas" },
  partial: { icon: Clock, cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", label: "Sebagian" },
  unpaid: { icon: AlertCircle, cls: "text-red-600 bg-red-50 dark:bg-red-950/30", label: "Belum" },
};

export function InventoryPurchasePanel() {
  const searchQuery = useInventoryStore((s) => s.searchQuery);
  const setSearchQuery = useInventoryStore((s) => s.setSearchQuery);
  const loadDemoData = useInventoryStore((s) => s.loadDemoData);
  const invoices = useInventoryStore((s) => s.purchaseInvoices);
  const batches = useInventoryStore((s) => s.batches);
  const suppliers = useInventoryStore((s) => s.suppliers);
  const [productList, setProductList] = useState<Array<{ id: string; name: string; defaultPrice?: number; defaultSellingPrice?: number; unit?: string }>>([]);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<{ id: string; remaining: number } | null>(null);
  const [importing, setImporting] = useState(false);

  // ─── Import handlers — hydrate existing purchase form ───

  const hydrateFormFromDraft = (draft: { items: Array<{ id: string; matchedProductId: string | null; rawProductName: string; quantity: number; enteredBuyPrice: number; currentSellingPrice: number; batchNumber: string | null; expiredDate: string | null }>; supplierId?: string | null }) => {
    try {
      setFormSupplier(draft.supplierId ?? "");
      setFormItems(draft.items.map((item) => ({
        id: item.id,
        tenantId: "",
        productId: item.matchedProductId ?? "",
        productName: item.rawProductName,
        batchNumber: item.batchNumber ?? "",
        expiredDate: item.expiredDate ?? "",
        quantity: item.quantity,
        unitPrice: item.enteredBuyPrice,
        sellingPrice: item.currentSellingPrice,
      })));
      setShowForm(true);
    } catch (e) {
      console.error("[P0.9I CRASH] hydrateFormFromDraft", e instanceof Error ? e.stack : e);
      throw e;
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { importCsvToDraft } = await import("@/lib/purchasing/csv/csv-service");
      const text = await file.text();
      const result = importCsvToDraft(text, productList.map(p => ({ id: p.id, name: p.name })), {
        tenantId: "", branchId: null, userId: null,
        generateDraftId: () => crypto.randomUUID(),
        generateItemId: () => crypto.randomUUID(),
      });
      hydrateFormFromDraft(result.draft);
      toast.success(`CSV berhasil diimpor. ${result.draft.items.length} item dimuat ke form.`);
    } catch (err) {
      console.error("[P0.9I CRASH] handleImportCsv", err instanceof Error ? err.stack : err);
      toast.error(err instanceof Error ? err.message : "Gagal mengimpor CSV.");
    } finally {
      setImporting(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { importExcelToDraft } = await import("@/lib/purchasing/excel/excel-service");
      const result = await importExcelToDraft(file, productList.map(p => ({ id: p.id, name: p.name })), {
        tenantId: "", branchId: null, userId: null,
        generateDraftId: () => crypto.randomUUID(),
        generateItemId: () => crypto.randomUUID(),
      });
      hydrateFormFromDraft(result.draft);
      toast.success(`Excel berhasil diimpor. ${result.draft.items.length} item dimuat ke form.`);
    } catch (err) {
      console.error("[P0.9I CRASH] handleImportExcel", err instanceof Error ? err.stack : err);
      toast.error(err instanceof Error ? err.message : "Gagal mengimpor Excel.");
    } finally {
      setImporting(false);
      if (e.target) e.target.value = "";
    }
  };

  const downloadTemplateCsv = () => {
    const header = "nama_produk,qty,satuan,harga_beli,batch_number,expired_date";
    const rows = [
      "Paracetamol 500mg,10,strip,15000,BATCH-001,2027-06-19",
      "Amoxicillin 500mg,20,tablet,25000,,2027-12-31",
      "Vitamin C,50,botol,8500,,",
    ];
    const csv = [header, ...rows].join("\r\n") + "\r\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-pembelian.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template CSV berhasil diunduh.");
  };

  const downloadTemplateExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const data: (string | number)[][] = [
      ["nama_produk", "qty", "satuan", "harga_beli", "batch_number", "expired_date"],
      ["Paracetamol 500mg", 10, "strip", 15000, "BATCH-001", "2027-06-19"],
      ["Amoxicillin 500mg", 20, "tablet", 25000, "", "2027-12-31"],
      ["Vitamin C", 50, "botol", 8500, "", ""],
    ];
    const ws = utils.aoa_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "template-pembelian");
    writeFile(wb, "template-pembelian.xlsx");
    toast.success("Template Excel berhasil diunduh.");
  };

  useEffect(() => {
    if (productRepo.isConnected) {
      productRepo.getRawProducts({ isActive: true }).then(prods => {
        setProductList(prods.map(p => ({ id: p.id, name: p.name, defaultPrice: p.defaultPrice ?? 0, defaultSellingPrice: p.defaultSellingPrice ?? 0, unit: p.unit ?? '' })));
      }).catch(() => {
        // Fallback to batch-derived products
        const grouped = new Map<string, any>();
        for (const b of batches) {
          if (!grouped.has(b.productId) && b.quantity > 0) {
            grouped.set(b.productId, { id: b.productId, name: b.productName, defaultPrice: b.unitPrice, defaultSellingPrice: b.sellingPrice });
          }
        }
        setProductList(Array.from(grouped.values()));
      });
    } else {
      const grouped = new Map<string, any>();
      for (const b of batches) {
        if (!grouped.has(b.productId)) {
          grouped.set(b.productId, { id: b.productId, name: b.productName, defaultPrice: b.unitPrice, defaultSellingPrice: b.sellingPrice });
        }
      }
      setProductList(Array.from(grouped.values()));
    }
  }, [batches, productRepo.isConnected]);

  const canCreatePurchase = usePermission("purchases.create");

  useEffect(() => {
    if (batches.length === 0) loadDemoData();
  }, [batches.length, loadDemoData]);

  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "all">("all");
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  /* ---- purchase form state ---- */
  const [formSupplier, setFormSupplier] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formItems, setFormItems] = useState<PurchaseItem[]>([
    { id: "1", tenantId: "", productId: "", productName: "", batchNumber: "", expiredDate: "", quantity: 1, unitPrice: 0, sellingPrice: 0 },
  ]);

  const handleAddItem = () => {
    setFormItems((prev) => [
      ...prev,
      { id: String(Date.now()), tenantId: "", productId: "", productName: "", batchNumber: "", expiredDate: "", quantity: 1, unitPrice: 0, sellingPrice: 0 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (id: string, field: keyof PurchaseItem, value: string | number) => {
    setFormItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === "productId") {
          const prod = productList.find((p) => p.id === value);
          if (prod) {
            updated.productName = prod.name;
            updated.unitPrice = prod.defaultPrice ?? 0;
            updated.sellingPrice = prod.defaultSellingPrice ?? 0;
          }
        }
        return updated;
      }),
    );
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    setCreatingSupplier(true);
    try {
      const created = await supplierRepo.createSupplier({ name: newSupplierName.trim() });
      useInventoryStore.getState().addSupplier(created);
      setFormSupplier(created.id);
      setNewSupplierName("");
      setShowNewSupplier(false);
      toast.success(`Supplier "${created.name}" berhasil ditambahkan`);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menambah supplier");
    } finally {
      setCreatingSupplier(false);
    }
  };

  const handleSubmit = () => {
    const supplier = suppliers.find((s) => s.id === formSupplier);
    if (!supplier) { toast.error("Pilih supplier terlebih dahulu"); return; }
    const validItems = formItems.filter((it) => it.productId && it.productName && it.quantity > 0);
    if (validItems.length === 0) { toast.error("Isi minimal 1 item pembelian"); return; }
    for (const it of validItems) {
      if (!it.expiredDate) { toast.error("Isi tanggal kadaluarsa untuk semua item"); return; }
      if (it.unitPrice <= 0) { toast.error("Harga beli harus lebih dari 0"); return; }
      if (it.sellingPrice <= 0) { toast.error("Harga jual harus lebih dari 0"); return; }
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const invoiceNum = `INV-P-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

    const totalAmount = validItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

    const invoice: PurchaseInvoice = {
      id: `inv-${Date.now()}`,
      tenantId: "",
      invoiceNumber: invoiceNum,
      supplierId: supplier.id,
      supplierName: supplier.name,
      purchaseDate: now.toISOString(),
      dueDate: formDueDate || undefined,
      status: "unpaid",
      totalAmount,
      paidAmount: 0,
      items: validItems,
    };

    useInventoryStore.getState().addPurchase(invoice);
    toast.success(`Pembelian ${invoice.invoiceNumber} berhasil disimpan`);
    setShowForm(false);
    setFormSupplier("");
    setFormDueDate("");
    setFormItems([{ id: "1", tenantId: "", productId: "", productName: "", batchNumber: "", expiredDate: "", quantity: 1, unitPrice: 0, sellingPrice: 0 }]);
  };

  const filtered = useMemo(() => {
    let result = invoices;
    if (statusFilter !== "all") result = result.filter((i) => i.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.supplierName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [invoices, statusFilter, searchQuery]);

  const outstandingTotal = useMemo(
    () =>
      invoices
        .filter((i) => i.status !== "paid")
        .reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0),
    [invoices],
  );

  return (
    <div>
      {/* OCR Faktur — Coming Soon */}
      <div className="mb-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-200 dark:bg-neutral-800">
            <ScanLine className="h-5 w-5 text-neutral-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-neutral-400 dark:text-neutral-500">
                OCR Faktur
              </h3>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Coming Soon
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
              Scan faktur supplier dan otomatis membuat draft pembelian akan tersedia pada update berikutnya.
            </p>
          </div>
          <button
            disabled
            className="shrink-0 rounded-lg bg-neutral-200 px-3 py-1.5 text-[11px] font-medium text-neutral-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500"
          >
            Scan Faktur
          </button>
        </div>
      </div>

      {/* Import Pembelian */}
      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950">
            <Upload className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              Import Pembelian
            </h3>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              Import data supplier dari file CSV atau Excel
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Hidden file inputs */}
          <input
            type="file"
            accept=".csv"
            onChange={handleImportCsv}
            className="hidden"
            id="csv-upload"
            disabled={importing}
          />
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            className="hidden"
            id="excel-upload"
            disabled={importing}
          />

          <label
            htmlFor="csv-upload"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {importing ? "Mengimpor..." : "Import CSV"}
          </label>

          <label
            htmlFor="excel-upload"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {importing ? "Mengimpor..." : "Import Excel"}
          </label>

          <button
            onClick={downloadTemplateCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Template CSV
          </button>
          <button
            onClick={downloadTemplateExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Template Excel
          </button>
        </div>
      </div>

      {/* Add Purchase Button & Form */}
      {canCreatePurchase && (
        <div className="mb-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Pembelian
            </button>
          ) : (
            <div className="rounded-xl border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                  Tambah Pembelian
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Supplier + Due Date */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
                <div>
                  <label className="block text-[10px] font-medium text-neutral-500 mb-1">
                    Supplier
                  </label>
                  {showNewSupplier ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                        placeholder="Nama supplier..."
                        autoFocus
                        className="flex-1 rounded-lg border border-brand-300 bg-white py-2 px-3 text-xs text-neutral-700 placeholder-neutral-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-brand-600 dark:bg-neutral-800 dark:text-neutral-50"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateSupplier();
                          if (e.key === "Escape") {
                            setShowNewSupplier(false);
                            setNewSupplierName("");
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateSupplier}
                        disabled={!newSupplierName.trim() || creatingSupplier}
                        className="rounded-lg bg-brand-600 px-2.5 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1"
                      >
                        {creatingSupplier ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewSupplier(false);
                          setNewSupplierName("");
                        }}
                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formSupplier}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setShowNewSupplier(true);
                        } else {
                          setFormSupplier(e.target.value);
                        }
                      }}
                      className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                    >
                      <option value="">Pilih supplier...</option>
                      {suppliers
                        .filter((s) => s.isActive)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      <option disabled className="border-t border-neutral-200">──────────</option>
                      <option value="__new__" className="text-brand-600 font-medium">
                        + Supplier Baru
                      </option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-neutral-500 mb-1">
                    Jatuh Tempo (opsional)
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                  />
                </div>
              </div>

              {/* Items table */}
              <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700 mb-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-neutral-400">
                        Produk
                      </th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-neutral-400">
                        Batch (Opsional)
                      </th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-neutral-400">
                        ED
                      </th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium text-neutral-400">
                        Qty
                      </th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium text-neutral-400">
                        Hrg Beli
                      </th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium text-neutral-400">
                        Hrg Jual
                      </th>
                      <th className="px-2 py-1.5 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {formItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-1">
                            <select
                              value={item.productId || (item.productName ? "__imported__" : "")}
                              onChange={(e) =>
                                handleItemChange(item.id, "productId", e.target.value)
                              }
                              className="flex-1 rounded border border-neutral-200 bg-white py-1 px-1.5 text-[11px] text-neutral-700 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                            >
                              {!item.productId && item.productName ? (
                                <option value="__imported__" disabled>
                                  {item.productName}
                                </option>
                              ) : (
                                <option value="">Pilih produk...</option>
                              )}
                              {productList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setShowQuickCreate(true)}
                              className="shrink-0 inline-flex items-center gap-0.5 rounded border border-dashed border-neutral-300 px-1.5 py-1 text-[10px] text-neutral-400 hover:border-brand-400 hover:text-brand-600 transition-colors dark:border-neutral-600 dark:hover:border-brand-500"
                              title="Buat produk baru"
                            >
                              <PlusCircle className="h-3 w-3" />
                              Baru
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={item.batchNumber}
                            onChange={(e) =>
                              handleItemChange(item.id, "batchNumber", e.target.value)
                            }
                            placeholder="Kosongkan untuk auto-generate"
                            className="w-full rounded border border-neutral-200 bg-white py-1 px-1.5 text-[11px] text-neutral-700 placeholder-neutral-300 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="date"
                            value={item.expiredDate}
                            onChange={(e) =>
                              handleItemChange(item.id, "expiredDate", e.target.value)
                            }
                            className="w-full rounded border border-neutral-200 bg-white py-1 px-1.5 text-[11px] text-neutral-700 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "quantity",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-14 rounded border border-neutral-200 bg-white py-1 px-1.5 text-[11px] text-right text-neutral-700 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min={0}
                            value={item.unitPrice || ""}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "unitPrice",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            placeholder="0"
                            className="w-20 rounded border border-neutral-200 bg-white py-1 px-1.5 text-[11px] text-right text-neutral-700 placeholder-neutral-300 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min={0}
                            value={item.sellingPrice || ""}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "sellingPrice",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            placeholder="0"
                            className="w-20 rounded border border-neutral-200 bg-white py-1 px-1.5 text-[11px] text-right text-neutral-700 placeholder-neutral-300 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                          />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={formItems.length <= 1}
                            className="rounded p-0.5 text-neutral-300 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add item + Submit */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500 hover:border-brand-400 hover:text-brand-600 transition-colors dark:border-neutral-600 dark:hover:border-brand-500"
                >
                  <Plus className="h-3 w-3" />
                  Tambah Item
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    Simpan Pembelian
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary bar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[10px] text-neutral-500">Total Hutang</span>
          <span className="ml-2 text-sm font-bold text-red-600 tabular-nums">
            Rp {Math.round(outstandingTotal).toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                statusFilter === f.value
                  ? "bg-brand-600 text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari invoice atau supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[5%] px-3 py-2.5" />
              <th className="w-[22%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Invoice
              </th>
              <th className="w-[22%] hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Supplier
              </th>
              <th className="w-[13%] hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Tanggal
              </th>
              <th className="w-[12%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Status
              </th>
              <th className="w-[13%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Total
              </th>
              <th className="w-[13%] hidden md:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Sisa
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <ShoppingCart className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Tidak ada invoice pembelian
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const isExpanded = expandedInvoice === inv.id;
                const st = STATUS_STYLE[inv.status];
                const StatusIcon = st.icon;
                const remaining = inv.totalAmount - inv.paidAmount;

                return (
                  <tr key={inv.id} className="group">
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() =>
                          setExpandedInvoice(isExpanded ? null : inv.id)
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
                      <span className="text-sm font-mono font-medium text-neutral-900 dark:text-neutral-50">
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5">
                      <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate block">
                        {inv.supplierName}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5">
                      <div className="text-xs text-neutral-500">
                        <div>{new Date(inv.purchaseDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}</div>
                        {inv.dueDate && (
                          <div
                            className={cn(
                              "text-[10px]",
                              new Date(inv.dueDate) < new Date() && inv.status !== "paid"
                                ? "text-red-500 font-semibold"
                                : "text-neutral-400",
                            )}
                          >
                            JT: {new Date(inv.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>
                        <StatusIcon className="h-3 w-3" />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                        Rp {inv.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={cn("text-sm tabular-nums", remaining > 0 ? "text-red-600 font-medium" : "text-green-600")}>
                          {remaining > 0 ? `Rp ${remaining.toLocaleString("id-ID")}` : "—"}
                        </span>
                        {inv.status !== "paid" && canCreatePurchase && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPayingInvoice({ id: inv.id, remaining });
                            }}
                            className="text-[10px] font-medium text-brand-600 hover:text-brand-700 hover:underline whitespace-nowrap"
                          >
                            Bayar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded: line items */}
      {expandedInvoice && (
        <PurchaseDetailPanel
          invoiceId={expandedInvoice}
          onClose={() => setExpandedInvoice(null)}
        />
      )}

      {/* Quick-create product modal */}
      <QuickCreateProductModal
        open={showQuickCreate}
        onClose={() => setShowQuickCreate(false)}
        onCreated={(newProduct) => {
          setProductList((prev) => [...prev, newProduct]);
          const emptyItem = formItems.find((it) => !it.productId);
          if (emptyItem) {
            handleItemChange(emptyItem.id, "productId", newProduct.id);
            handleItemChange(emptyItem.id, "productName", newProduct.name);
            handleItemChange(emptyItem.id, "unitPrice", newProduct.defaultPrice);
            handleItemChange(
              emptyItem.id,
              "sellingPrice",
              newProduct.defaultSellingPrice,
            );
          }
        }}
      />

    {/* Purchase Payment Modal */}
    <InventoryPayInvoiceModal
      open={payingInvoice !== null}
      invoiceId={payingInvoice?.id ?? ""}
      remaining={payingInvoice?.remaining ?? 0}
      onClose={() => setPayingInvoice(null)}
    />

    </div>
  );
}

function PurchaseDetailPanel({
  invoiceId,
  onClose,
}: {
  invoiceId: string;
  onClose: () => void;
}) {
  const invoice = useInventoryStore((s) =>
    s.purchaseInvoices.find((i) => i.id === invoiceId),
  );

  if (!invoice) return null;

  return (
    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/20">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {invoice.invoiceNumber} — {invoice.supplierName}
          </h4>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            {invoice.items.length} item · Total: Rp {invoice.totalAmount.toLocaleString("id-ID")} · Dibayar: Rp {invoice.paidAmount.toLocaleString("id-ID")}
          </p>
        </div>
        <button onClick={onClose} className="text-[10px] text-neutral-400 hover:text-neutral-600">
          Tutup
        </button>
      </div>

      {/* Payment progress bar */}
      {invoice.status !== "paid" && invoice.totalAmount > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
            <span>Progress Pembayaran</span>
            <span>{Math.round((invoice.paidAmount / invoice.totalAmount) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div
              className="h-1.5 rounded-full bg-brand-500 transition-all"
              style={{
                width: `${Math.min((invoice.paidAmount / invoice.totalAmount) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
            <span>Rp {invoice.paidAmount.toLocaleString("id-ID")}</span>
            <span>Rp {invoice.totalAmount.toLocaleString("id-ID")}</span>
          </div>
        </div>
      )}

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700">
            <th className="py-1.5 pr-2 text-left text-[10px] font-medium text-neutral-400">Produk</th>
            <th className="py-1.5 pr-2 text-left text-[10px] font-medium text-neutral-400">Batch</th>
            <th className="py-1.5 pr-2 text-left text-[10px] font-medium text-neutral-400">ED</th>
            <th className="py-1.5 pr-2 text-right text-[10px] font-medium text-neutral-400">Qty</th>
            <th className="py-1.5 pr-2 text-right text-[10px] font-medium text-neutral-400">Harga</th>
            <th className="py-1.5 text-right text-[10px] font-medium text-neutral-400">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td className="py-1.5 pr-2 text-neutral-700 dark:text-neutral-300">{item.productName}</td>
              <td className="py-1.5 pr-2 font-mono text-neutral-500">{item.batchNumber}</td>
              <td className="py-1.5 pr-2 text-neutral-500">
                {new Date(item.expiredDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums font-medium">{item.quantity}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums text-neutral-500">
                {item.unitPrice.toLocaleString("id-ID")}
              </td>
              <td className="py-1.5 text-right tabular-nums font-medium text-neutral-700 dark:text-neutral-300">
                {(item.quantity * item.unitPrice).toLocaleString("id-ID")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
