"use client";

import { create } from "zustand";
import type {
  ProductBatch,
  Supplier,
  PurchaseInvoice,
  PurchaseStatus,
  StockMovement,
  StockOpname,
  InventoryProduct,
  DashboardSummary,
} from "@/types/inventory";
import {
  DEMO_BATCHES,
  DEMO_SUPPLIERS,
  DEMO_PURCHASE_INVOICES,
  DEMO_STOCK_MOVEMENTS,
  DEMO_STOCK_OPNAME,
  getFefoBatches,
  getNearExpiryBatches,
  getExpiredBatches,
  allocateFefo,
  applySaleDeduction,
  buildInventoryProducts,
  buildDashboardSummary,
} from "@/lib/inventory-demo";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { productRepo, supplierRepo, inventoryRepo, transactionRepo } from "@/lib/repository-instances";
import { logActivity } from "@/lib/audit/activity-logger";

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

export type InventoryTab =
  | "dashboard"
  | "stock"
  | "purchase"
  | "movement"
  | "expired"
  | "opname";

interface InventoryState {
  /* Data */
  batches: ProductBatch[];
  suppliers: Supplier[];
  purchaseInvoices: PurchaseInvoice[];
  stockMovements: StockMovement[];
  stockOpnames: StockOpname[];
  saleAllocations: Array<{ transactionId: string; transactionItemId: string; batchId: string; batchNumber: string; expiredDate: string | null; quantity: number; costPrice: number }>;

  /* Branch context */
  branchId: string | null;

  /* UI */
  activeTab: InventoryTab;
  searchQuery: string;
  isDemoMode: boolean;
  dataSource: "demo" | "database" | "loading";
  isLoading: boolean;
  isSubmitting: boolean;

  /* Actions — branch context */
  setBranchContext: (branchId: string | null) => void;

  /* Actions — UI */
  setActiveTab: (tab: InventoryTab) => void;
  setSearchQuery: (query: string) => void;

  /* Actions — supplier */
  addSupplier: (supplier: Supplier) => void;

  /* Actions — purchase */
  addPurchase: (invoice: PurchaseInvoice) => Promise<void>;

  /* Actions — batch queries */
  getFefoBatches: (productId?: string) => ProductBatch[];
  getNearExpiryBatches: (daysThreshold?: number) => ProductBatch[];
  getExpiredBatches: () => ProductBatch[];
  allocateFefo: (productId: string, neededQty: number) => ReturnType<typeof allocateFefo>;

  /* Actions — stock opname */
  performOpname: (opname: StockOpname) => Promise<void>;

  /* Actions — write-off */
  writeOffExpiredBatches: (batchIds: string[], note?: string) => Promise<void>;

  /* Actions — payment */
  recordPayment: (invoiceId: string, amount: number, walletId?: string, paymentMethod?: string) => Promise<void>;

  /* Actions — sale deduction */
  deductForSale: (cart: { id?: string; productId: string; productName?: string; quantity: number }[], transactionId: string) => Promise<void>;

  /* Actions — computed */
  getInventoryProducts: () => InventoryProduct[];
  getDashboardSummary: () => DashboardSummary;
  getLowStockProducts: () => InventoryProduct[];

  /* Actions — demo */
  loadDemoData: () => Promise<void>;
  _loadDemoFallback: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  /* ---- initial state ---- */
  batches: [],
  suppliers: [],
  purchaseInvoices: [],
  stockMovements: [],
  stockOpnames: [],
  saleAllocations: [],
  branchId: null,
  activeTab: "dashboard",
  searchQuery: "",
  isDemoMode: checkDemoMode(),
  dataSource: checkDemoMode() ? ("demo" as const) : ("loading" as const),
  isLoading: false,
  isSubmitting: false,

  /* ---- branch context ---- */
  setBranchContext: (branchId) => {
    set({ branchId });
    const bid = branchId ?? undefined;
    inventoryRepo.setBranchContext(bid);
    transactionRepo.setBranchContext(bid);
    supplierRepo.setBranchContext(bid);
    // productRepo branch context managed per-operation with finally cleanup
    // to prevent singleton leakage across pages (P0.1 fix)
  },

  /* ---- UI ---- */
  setActiveTab: (tab) => set({ activeTab: tab, searchQuery: "" }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  /* ---- supplier ---- */
  addSupplier: (supplier) => {
    set({ suppliers: [...get().suppliers, supplier] });
  },

  /* ---- purchase ---- */
  addPurchase: async (invoice) => {
    const state = get();

    // DB-aware path
    if (state.dataSource === 'database') {
      set({ isSubmitting: true });

      // Sync branch context before DB queries
      const { branchId } = get();
      if (branchId) {
        inventoryRepo.setBranchContext(branchId);
        transactionRepo.setBranchContext(branchId);
        supplierRepo.setBranchContext(branchId);
        productRepo.setBranchContext(branchId);
      }

      try {
        // Auto-generate batch number for items without one
        // Format: AUTO-{invoiceNumber}-{NN} (e.g. AUTO-INV-P-20260613-001-01)
        let autoSeq = 0;
        const generateAutoBatch = () => {
          autoSeq++;
          return `AUTO-${invoice.invoiceNumber}-${String(autoSeq).padStart(2, "0")}`;
        };
        for (const item of invoice.items) {
          if (!item.batchNumber?.trim()) {
            item.batchNumber = generateAutoBatch();
          }
        }

        // 1. Create purchase invoice with items in the DB
        await supplierRepo.createPurchaseInvoice({
          invoiceNumber: invoice.invoiceNumber,
          supplierId: invoice.supplierId,
          supplierName: invoice.supplierName,
          purchaseDate: invoice.purchaseDate,
          dueDate: invoice.dueDate,
          status: invoice.status,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          items: invoice.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            batchNumber: item.batchNumber,
            expiredDate: item.expiredDate,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sellingPrice: item.sellingPrice,
          })),
        });

        // 2. For each item: upsert batch + create stock movement
        for (const item of invoice.items) {
          const existingBatches = await inventoryRepo.getBatchesByProduct(item.productId);
          const existing = existingBatches.find(b => b.batchNumber === item.batchNumber);

          if (existing) {
            const qtyBefore = existing.quantity;
            const qtyAfter = qtyBefore + item.quantity;
            await inventoryRepo.updateBatchQuantity(existing.id, qtyAfter);
            await inventoryRepo.createStockMovement({
              type: 'purchase',
              productId: item.productId,
              productName: item.productName,
              batchId: existing.id,
              batchNumber: item.batchNumber,
              qtyBefore,
              qtyChange: item.quantity,
              qtyAfter,
              referenceNumber: invoice.invoiceNumber,
              note: `Pembelian dari ${invoice.supplierName}`,
            });
          } else {
            const newBatch = await inventoryRepo.createBatch({
              productId: item.productId,
              batchNumber: item.batchNumber,
              expiredDate: item.expiredDate,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              sellingPrice: item.sellingPrice,
            });
            await inventoryRepo.createStockMovement({
              type: 'purchase',
              productId: item.productId,
              productName: item.productName,
              batchId: newBatch.id,
              batchNumber: item.batchNumber,
              qtyBefore: 0,
              qtyChange: item.quantity,
              qtyAfter: item.quantity,
              referenceNumber: invoice.invoiceNumber,
              note: `Pembelian baru dari ${invoice.supplierName}`,
            });
          }
        }

        // 3. Reload state from DB — bypass loadDemoData guard
        try {
          const [products, suppliers] = await Promise.all([
            productRepo.getProducts(),
            supplierRepo.getSuppliers(),
          ]);
          const allBatches: ProductBatch[] = [];
          for (const p of products) {
            for (const b of p.batches) {
              allBatches.push({ ...b, productName: p.name });
            }
          }
          const invoices = await supplierRepo.getPurchaseInvoices();
          const movements = await inventoryRepo.getStockMovements();
          set({
            batches: allBatches,
            suppliers,
            purchaseInvoices: invoices,
            stockMovements: movements,
            dataSource: "database",
            isDemoMode: false,
            isSubmitting: false,
          });
          logActivity({
            action: "purchase.created", resourceType: "purchase_invoice", resourceId: invoice.id,
            reference: invoice.invoiceNumber,
            metadata: { totalAmount: invoice.totalAmount, itemCount: invoice.items.length, supplierName: invoice.supplierName },
          }).catch(() => {});
        } catch {
          set({ isSubmitting: false });
        }
        return;
      } catch (e) {
        console.error('DB purchase failed, falling back to demo mode:', e);
        set({ isSubmitting: false });
        // Fall through to existing demo logic
      } finally {
        productRepo.setBranchContext(undefined);
      }
    }

    // ---- EXISTING DEMO LOGIC (unchanged) ----
    const now = new Date().toISOString();

    // Upsert batches
    let updatedBatches = [...state.batches];
    const newMovements: StockMovement[] = [];

    for (const item of invoice.items) {
      const existingIdx = updatedBatches.findIndex(
        (b) =>
          b.productId === item.productId &&
          b.batchNumber === item.batchNumber,
      );

      if (existingIdx !== -1) {
        const existing = updatedBatches[existingIdx]!;
        const qtyBefore = existing.quantity;
        const qtyAfter = qtyBefore + item.quantity;

        // Replace with new object (immutable update)
        updatedBatches = updatedBatches.map((b, i) =>
          i === existingIdx
            ? { ...b, quantity: qtyAfter, unitPrice: item.unitPrice, sellingPrice: item.sellingPrice }
            : b,
        );

        newMovements.push({
          id: `mov-${generateUUID()}`,
          tenantId: "",
          timestamp: now,
          type: "purchase",
          productId: item.productId,
          productName: item.productName,
          batchId: existing.id,
          batchNumber: item.batchNumber,
          qtyBefore,
          qtyChange: item.quantity,
          qtyAfter,
          referenceNumber: invoice.invoiceNumber,
          note: `Pembelian dari ${invoice.supplierName}`,
          userId: "user-demo",
          userName: "Admin Demo",
        });
      } else {
        const newBatch: ProductBatch = {
          id: `bat-${generateUUID()}`,
          tenantId: "",
          productId: item.productId,
          productName: item.productName,
          batchNumber: item.batchNumber,
          expiredDate: item.expiredDate,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sellingPrice: item.sellingPrice,
          createdAt: now,
        };
        updatedBatches.push(newBatch);

        newMovements.push({
          id: `mov-${generateUUID()}`,
          tenantId: "",
          timestamp: now,
          type: "purchase",
          productId: item.productId,
          productName: item.productName,
          batchId: newBatch.id,
          batchNumber: item.batchNumber,
          qtyBefore: 0,
          qtyChange: item.quantity,
          qtyAfter: item.quantity,
          referenceNumber: invoice.invoiceNumber,
          note: `Pembelian baru dari ${invoice.supplierName}`,
          userId: "user-demo",
          userName: "Admin Demo",
        });
      }
    }

    set({
      batches: updatedBatches,
      purchaseInvoices: [invoice, ...state.purchaseInvoices],
      stockMovements: [...newMovements, ...state.stockMovements],
    });
  },

  /* ---- batch queries ---- */

  getFefoBatches: (productId) => getFefoBatches(get().batches, productId),

  getNearExpiryBatches: (daysThreshold = 90) =>
    getNearExpiryBatches(get().batches, daysThreshold),

  getExpiredBatches: () => getExpiredBatches(get().batches),

  allocateFefo: (productId, neededQty) =>
    allocateFefo(get().batches, productId, neededQty),

  /* ---- stock opname ---- */

  performOpname: async (opname) => {
    const state = get();

    if (state.dataSource === 'database') {
      set({ isSubmitting: true });

      // Sync branch context before DB queries
      const { branchId } = get();
      if (branchId) {
        inventoryRepo.setBranchContext(branchId);
        transactionRepo.setBranchContext(branchId);
        supplierRepo.setBranchContext(branchId);
        productRepo.setBranchContext(branchId);
      }

      try {
        // Create stock opname in DB
        await inventoryRepo.createStockOpname({
          opnameDate: opname.date,
          status: opname.status,
          conductedBy: opname.conductedBy || undefined,
          notes: opname.notes || undefined,
          items: opname.items
            .filter(item => item.difference !== 0)
            .map(item => ({
              productId: item.productId,
              batchId: item.batchId,
              systemQty: item.systemQty,
              physicalQty: item.physicalQty,
              note: item.note || undefined,
            })),
        });

        // For each item with difference: update batch + create movement
        for (const item of opname.items) {
          if (item.difference === 0) continue;

          await inventoryRepo.updateBatchQuantity(item.batchId, item.physicalQty);
          await inventoryRepo.createStockMovement({
            type: 'adjustment',
            productId: item.productId,
            productName: item.productName,
            batchId: item.batchId,
            batchNumber: item.batchNumber,
            qtyBefore: item.systemQty,
            qtyChange: item.difference,
            qtyAfter: item.physicalQty,
            referenceNumber: `OPN-${opname.id.slice(0, 8)}`,
            note: item.note || `Penyesuaian dari opname ${opname.date}`,
          });
        }

        // Reload state directly (bypass loadDemoData guard — same pattern as addPurchase)
        try {
          const [products, suppliers] = await Promise.all([
            productRepo.getProducts(),
            supplierRepo.getSuppliers(),
          ]);
          const allBatches: ProductBatch[] = [];
          for (const p of products) {
            for (const b of p.batches) {
              allBatches.push({ ...b, productName: p.name });
            }
          }
          const [invoices, movements, opnames] = await Promise.all([
            supplierRepo.getPurchaseInvoices(),
            inventoryRepo.getStockMovements(),
            inventoryRepo.getStockOpnames(),
          ]);
          set({
            batches: allBatches,
            suppliers,
            purchaseInvoices: invoices,
            stockMovements: movements,
            stockOpnames: opnames,
            dataSource: "database",
            isDemoMode: false,
            isSubmitting: false,
          });
          logActivity({
            action: "opname.created", resourceType: "stock_opname", resourceId: opname.id,
            reference: `OPN-${opname.id.slice(0, 8)}`,
            severity: "warning",
            metadata: { itemCount: opname.items.length, diffCount: opname.items.filter((i: any) => i.difference !== 0).length },
          }).catch(() => {});
        } catch {
          set({ isSubmitting: false });
        }
        return;
      } catch (e) {
        console.error('DB opname failed, falling back to demo:', e);
        set({ isSubmitting: false });
      } finally {
        productRepo.setBranchContext(undefined);
      }
    }

    // ---- EXISTING DEMO LOGIC (unchanged) ----
    const now = new Date().toISOString();

    // Create adjustment movements for differences
    const newMovements: StockMovement[] = [];
    for (const item of opname.items) {
      if (item.difference === 0) continue;

      newMovements.push({
        id: `mov-${generateUUID()}`,
        tenantId: "",
        timestamp: now,
        type: "adjustment",
        productId: item.productId,
        productName: item.productName,
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        qtyBefore: item.systemQty,
        qtyChange: item.difference,
        qtyAfter: item.physicalQty,
        referenceNumber: `OPN-${opname.id}`,
        note: item.note || `Penyesuaian dari opname ${opname.date}`,
        userId: "user-demo",
        userName: "Admin Demo",
      });

    }

    // Apply batch quantity updates immutably
    let updatedBatches = get().batches;
    for (const item of opname.items) {
      if (item.difference === 0) continue;
      updatedBatches = updatedBatches.map((b) =>
        b.id === item.batchId ? { ...b, quantity: item.physicalQty } : b,
      );
    }

    set({
      stockOpnames: [opname, ...state.stockOpnames],
      stockMovements: [...newMovements, ...state.stockMovements],
      batches: updatedBatches,
    });
  },

  /* ---- write-off ---- */

  writeOffExpiredBatches: async (batchIds, note) => {
    const state = get();

    if (state.dataSource === 'database') {
      set({ isSubmitting: true });

      // Sync branch context before DB queries
      const { branchId } = get();
      if (branchId) {
        inventoryRepo.setBranchContext(branchId);
        transactionRepo.setBranchContext(branchId);
        supplierRepo.setBranchContext(branchId);
        productRepo.setBranchContext(branchId);
      }

      try {
        for (const id of batchIds) {
          const batch = state.batches.find(b => b.id === id);
          if (!batch || batch.quantity === 0) continue;

          await inventoryRepo.updateBatchQuantity(id, 0);
          await inventoryRepo.createStockMovement({
            type: 'expired',
            productId: batch.productId,
            productName: batch.productName,
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            qtyBefore: batch.quantity,
            qtyChange: -batch.quantity,
            qtyAfter: 0,
            referenceNumber: `WO-${new Date().toISOString().slice(0, 10)}`,
            note: note || 'Write-off kadaluarsa',
          });
        }

        await get().loadDemoData();
        set({ isSubmitting: false });
        return;
      } catch (e) {
        console.error('DB write-off failed, falling back to demo:', e);
        set({ isSubmitting: false });
      } finally {
        productRepo.setBranchContext(undefined);
      }
    }

    // ---- EXISTING DEMO LOGIC (unchanged) ----
    const now = new Date().toISOString();
    const newMovements: StockMovement[] = [];

    let updatedBatches = state.batches;
    for (const id of batchIds) {
      const batch = updatedBatches.find((b) => b.id === id);
      if (!batch || batch.quantity === 0) continue;

      newMovements.push({
        id: `mov-${generateUUID()}`,
        tenantId: "",
        timestamp: now,
        type: "expired",
        productId: batch.productId,
        productName: batch.productName,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        qtyBefore: batch.quantity,
        qtyChange: -batch.quantity,
        qtyAfter: 0,
        referenceNumber: `WO-${now.slice(0, 10)}`,
        note: note || "Write-off kadaluarsa",
        userId: "user-demo",
        userName: "Admin Demo",
      });

      updatedBatches = updatedBatches.map((b) =>
        b.id === id ? { ...b, quantity: 0 } : b,
      );
    }

    set({
      batches: updatedBatches,
      stockMovements: [...newMovements, ...state.stockMovements],
    });
  },

  /* ---- payment ---- */

  recordPayment: async (invoiceId, amount, walletId, paymentMethod) => {
    const state = get();

    if (state.dataSource === 'database') {
      const { branchId } = get();
      if (branchId) {
        inventoryRepo.setBranchContext(branchId);
        transactionRepo.setBranchContext(branchId);
        supplierRepo.setBranchContext(branchId);
        productRepo.setBranchContext(branchId);
      }

      const invoice = state.purchaseInvoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        const newPaid = invoice.paidAmount + amount;
        try {
          await supplierRepo.updatePurchaseInvoicePayment(invoiceId, newPaid, walletId);

          // Record purchase_payments row for history
          if (walletId) {
            const { supabase } = await import("@/lib/supabase/client");
            if (supabase) {
              const wallet = (get() as any).wallets?.find?.((w: any) => w.id === walletId);
              await (supabase as any).from("purchase_payments").insert({
                invoice_id: invoiceId,
                wallet_id: walletId,
                amount,
                payment_method: paymentMethod ?? "transfer",
                wallet_name: wallet?.name ?? null,
              });
            }
          }

          // Reload invoices + batch data
          try {
            const invoices = await supplierRepo.getPurchaseInvoices();
            const products = await productRepo.getProducts();
            const allBatches: ProductBatch[] = [];
            for (const p of products) {
              for (const b of p.batches) {
                allBatches.push({ ...b, productName: p.name });
              }
            }
            set({
              purchaseInvoices: invoices,
              batches: allBatches,
              dataSource: "database",
            });
          } catch { /* best-effort reload */ }
          return;
        } catch (e) {
          console.error('DB payment failed, falling back to demo:', e);
        } finally {
          productRepo.setBranchContext(undefined);
        }
      }
    }

    // ---- EXISTING DEMO LOGIC (unchanged) ----
    set({
      purchaseInvoices: get().purchaseInvoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const newPaid = inv.paidAmount + amount;
        const newStatus: PurchaseStatus =
          newPaid >= inv.totalAmount ? "paid" :
          newPaid > 0 ? "partial" : "unpaid";
        return { ...inv, paidAmount: newPaid, status: newStatus };
      }),
    });
  },

  /* ---- computed ---- */

  getInventoryProducts: () => buildInventoryProducts(get().batches),

  getDashboardSummary: () =>
    buildDashboardSummary(
      get().batches,
      get().purchaseInvoices,
      get().stockMovements,
    ),

  getLowStockProducts: () => {
    const products = buildInventoryProducts(get().batches);
    return products.filter((p) => p.totalStock <= p.minStock);
  },

  /* ---- sale deduction ---- */

  deductForSale: async (cart, transactionId) => {
    const state = get();

    // Guard: wait for inventory to load if still loading
    if (state.dataSource === "loading" || state.dataSource === "demo") {
      console.log("[DEDUCT-TRACE] Inventory not loaded (dataSource:", state.dataSource, "). Loading now...");
      await get().loadDemoData();
      // Re-read state after load
      const loaded = get();
      if (loaded.batches.length === 0) {
        throw new Error("Inventory gagal dimuat. Tidak dapat melanjutkan transaksi. Silakan coba lagi.");
      }
    }

    const now = new Date().toISOString();
    const newMovements: StockMovement[] = [];
    let updatedBatches = [...get().batches];

    console.log("[DEDUCT-TRACE] deductForSale called. state.batches.length:", state.batches.length);
    console.log("[DEDUCT-TRACE] state.dataSource:", state.dataSource);
    console.log("[DEDUCT-TRACE] state.isDemoMode:", state.isDemoMode);
    if (state.batches.length > 0) {
      const first = state.batches[0];
      if (first) {
        console.log("[DEDUCT-TRACE] First batch sample:", JSON.stringify({
          id: first.id, productId: first.productId,
          productName: first.productName, quantity: first.quantity,
          tenantId: (first as any).tenantId,
        }));
      }
    } else {
      console.warn("[DEDUCT-TRACE] ⚠️ state.batches is EMPTY! Load demo data first.");
    }

    // Process each cart item
    for (const item of cart) {
      const { productId, quantity } = item;
      const matchingBatches = updatedBatches.filter((b) => b.productId === productId && b.quantity > 0);
      console.log("[DEDUCT-TRACE] productId:", productId, "requestedQty:", quantity);
      console.log("[DEDUCT-TRACE] matchingBatches:", matchingBatches.length, "| all batches:", updatedBatches.length);
      if (matchingBatches.length === 0 && updatedBatches.length > 0) {
        console.warn("[DEDUCT-TRACE] ⚠️ No match! Available productIds:", [...new Set(updatedBatches.map(b => b.productId))]);
      }

      // 1. FEFO allocation — which batches to draw from
      const allocations = allocateFefo(updatedBatches, productId, quantity);

      // Validate total allocated matches requested quantity
      const totalAllocated = allocations.reduce((sum, a) => sum + a.take, 0);
      if (totalAllocated < quantity) {
        // Try to get product name from any matching batch
        const batch = updatedBatches.find((b) => b.productId === productId);
        const name = batch?.productName ?? productId;
        throw new Error(
          `Stok tidak mencukupi untuk ${name}: butuh ${quantity}, tersedia ${totalAllocated}`,
        );
      }

      // Get product name from the first allocation's batch
      const firstAlloc = allocations[0];
      const batch = updatedBatches.find((b) => b.id === firstAlloc?.batchId);
      const productName = batch?.productName ?? "";

      // 2. Apply deductions (immutable update)
      updatedBatches = applySaleDeduction(updatedBatches, allocations);

      // 3. Create stock movements for each batch draw
      for (const alloc of allocations) {
        newMovements.push({
          id: `mov-${generateUUID()}`,
          tenantId: "",
          timestamp: now,
          type: "sale",
          productId,
          productName,
          batchId: alloc.batchId,
          batchNumber: alloc.batchNumber,
          qtyBefore: alloc.remainingAfter + alloc.take,
          qtyChange: -alloc.take,
          qtyAfter: alloc.remainingAfter,
          referenceNumber: transactionId,
          note: `Penjualan transaksi ${transactionId}`,
          userId: "user-demo",
          userName: "Admin Demo",
        });
      }
    }

    // 4. Persist — DB or in-memory
    if (get().dataSource === "database") {
      set({ isSubmitting: true });

      // Sync branch context before DB queries
      const { branchId } = get();
      if (branchId) {
        inventoryRepo.setBranchContext(branchId);
        transactionRepo.setBranchContext(branchId);
        supplierRepo.setBranchContext(branchId);
        productRepo.setBranchContext(branchId);
      }

      try {
        // Recalculate allocations to get cost prices
        const cartWithAllocations = cart.map((item) => {
          const allocations = allocateFefo(updatedBatches, item.productId, item.quantity);
          return { item, allocations };
        });

        for (const movement of newMovements) {
          await inventoryRepo.updateBatchQuantity(movement.batchId, movement.qtyAfter);
          await inventoryRepo.createStockMovement({
            type: "sale", productId: movement.productId, productName: movement.productName,
            batchId: movement.batchId, batchNumber: movement.batchNumber,
            qtyBefore: movement.qtyBefore, qtyChange: movement.qtyChange, qtyAfter: movement.qtyAfter,
            referenceNumber: transactionId, note: `Penjualan transaksi ${transactionId}`,
          });
        }

        // Record sale_batch_allocations for HPP tracking
        const { supabase } = await import("@/lib/supabase/client");
        if (supabase) {
          const { useAuthStore } = await import("@/store/auth-store");
          const tenantId = useAuthStore.getState().user?.tenantId ?? null;
          console.log("[FEFO-ALLOC] Recording allocations for txn:", transactionId, "items:", cartWithAllocations.length, "tenant:", tenantId);
          for (const { item, allocations } of cartWithAllocations) {
            for (const alloc of allocations) {
              const row = {
                transaction_id: transactionId,
                transaction_item_id: (item as any).id ?? transactionId,
                batch_id: alloc.batchId,
                product_id: item.productId,
                quantity: alloc.take,
                cost_price: alloc.costPrice,
                subtotal_cost: alloc.take * alloc.costPrice,
                tenant_id: tenantId,
              };
              console.log("[FEFO-ALLOC] Inserting:", JSON.stringify(row));
              const { error: allocErr } = await (supabase as any).from("sale_batch_allocations").insert(row);
              if (allocErr) {
                console.error("[FEFO-ALLOC] INSERT FAILED:", allocErr.code, allocErr.message, allocErr.details);
              }
            }
          }
          console.log("[FEFO-ALLOC] Done. Check sale_batch_allocations for txn:", transactionId);
        } else {
          console.warn("[FEFO-ALLOC] Supabase client not available — allocations NOT saved");
        }

        await get().loadDemoData();
        set({ isSubmitting: false });
        return;
      } catch (e) {
        console.error(
          "DB deductForSale failed, falling back to demo:",
          e,
        );
        set({ isSubmitting: false });
        // Fall through to demo-mode logic
      } finally {
        productRepo.setBranchContext(undefined);
      }
    }

    // ---- DEMO / FALLBACK MODE ----
    set({
      batches: updatedBatches,
      stockMovements: [...newMovements, ...state.stockMovements],
    });
  },

  /* ---- demo ---- */

  loadDemoData: async () => {
    const state = get();
    // Prevent concurrent parallel loads from multiple components
    if (state.isLoading) return;
    // Skip if already loaded from database
    if (state.dataSource === "database" && state.batches.length > 0) return;
    // Skip if already loaded demo data
    if (state.dataSource === "demo" && state.batches.length > 0) return;

    // No tenant context — skip Supabase query (e.g. super admin with no tenant).
    // Without tenant_id the query is unfiltered and may hit RLS blocks.
    if (productRepo.isConnected && !productRepo.getTenantId()) {
      set({ dataSource: "database", isLoading: false });
      return;
    }

    if (productRepo.isConnected) {
      set({ dataSource: "loading", isLoading: true });

      // Sync branch context to repositories before querying
      const { branchId } = get();
      if (branchId) {
        inventoryRepo.setBranchContext(branchId);
        transactionRepo.setBranchContext(branchId);
        supplierRepo.setBranchContext(branchId);
        productRepo.setBranchContext(branchId);
      }

      try {
        const [products, suppliers] = await Promise.all([
          productRepo.getProducts(),
          supplierRepo.getSuppliers(),
        ]);

        // Fetch branch-scoped batches from inventoryRepo (withBranchScope)
        const branchBatches = await inventoryRepo.getBatches();

        // Load purchase invoices, stock movements, and opnames from repos
        const [purchaseInvoices, stockMovements, stockOpnames, saleAllocations] = await Promise.all([
          supplierRepo.getPurchaseInvoices(),
          inventoryRepo.getStockMovements(),
          inventoryRepo.getStockOpnames(),
          inventoryRepo.getSaleAllocations(),
        ]);

        set({
          batches: branchBatches,
          suppliers,
          purchaseInvoices,
          stockMovements,
          stockOpnames,
          saleAllocations,
          dataSource: "database",
          isDemoMode: false,
          isLoading: false,
        });
      } catch (e) {
        console.error(
          "Failed to load from database, falling back to demo:",
          e,
        );
        get()._loadDemoFallback();
      } finally {
        productRepo.setBranchContext(undefined);
      }
    } else {
      get()._loadDemoFallback();
    }
  },

  _loadDemoFallback: () => {
    if (checkDemoMode()) {
      set({
        batches: DEMO_BATCHES.map((b) => ({ ...b })),
        suppliers: [...DEMO_SUPPLIERS],
        purchaseInvoices: [...DEMO_PURCHASE_INVOICES],
        stockMovements: [...DEMO_STOCK_MOVEMENTS],
        stockOpnames: [DEMO_STOCK_OPNAME],
        dataSource: "demo",
        isDemoMode: true,
        isLoading: false,
      });
    } else {
      set({ dataSource: "database", isLoading: false });
    }
  },
}));
