"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useCashierStore, type CartItem } from "@/store/cashier-store";
import { productRepo } from "@/lib/repository-instances";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { toBaseUnit } from "@/lib/unit-converter";
import { buildAllocation } from "@/lib/cashier/allocation-builder";
import { calculatePricing } from "@/lib/cashier/pricing-engine";
import { createBatchPriceProvider } from "@/lib/cashier/adapters/batch-price-provider.adapter";
import { resolveCurrentSellingPrice } from "@/lib/cashier/resolve-current-selling-price";
import type { AllocationDraft, PriceSnapshot } from "@/lib/cashier/types";
import type { ProductBatch } from "@/types/inventory";

/* ------------------------------------------------------------------ */
/*  Demo product catalogue                                             */
/* ------------------------------------------------------------------ */

export interface DemoProduct {
  productId: string;
  productName: string;
  unitPrice: number;
  stockAvailable: number;
  category: string;
  batchNumber: string;
  expiredDate: string; // ISO date string
  /** V3 C3 — Multi Unit */
  unit?: string;
  unitLevels?: import("@/types/unit").UnitLevel[];
}

export const DEMO_PRODUCTS: readonly DemoProduct[] = [
  {
    productId: "demo-001",
    productName: "Paracetamol 500mg",
    unitPrice: 15000,
    stockAvailable: 100,
    category: "Obat Bebas",
    batchNumber: "PAR-2026-001",
    expiredDate: "2027-12-31",
    unit: "Tablet",
    unitLevels: [
      { level: 2, unitName: "Strip", contains: 10 },
    ],
  },
  {
    productId: "demo-002",
    productName: "Amoxicillin 500mg",
    unitPrice: 25000,
    stockAvailable: 50,
    category: "Antibiotik",
    batchNumber: "AMX-2026-001",
    expiredDate: "2027-06-30",
    unit: "Tablet",
    unitLevels: [
      { level: 2, unitName: "Strip", contains: 10 },
      { level: 3, unitName: "Dus", contains: 10 },
    ],
  },
  {
    productId: "demo-003",
    productName: "Vitamin C 1000mg",
    unitPrice: 35000,
    stockAvailable: 75,
    category: "Vitamin",
    batchNumber: "VTC-2026-001",
    expiredDate: "2027-09-30",
    unit: "Tablet",
    unitLevels: [
      { level: 2, unitName: "Strip", contains: 10 },
    ],
  },
  {
    productId: "demo-004",
    productName: "Antasida Tablet",
    unitPrice: 12000,
    stockAvailable: 60,
    category: "Obat Bebas",
    batchNumber: "ANT-2026-001",
    expiredDate: "2026-08-31",
    unit: "Tablet",
    unitLevels: [
      { level: 2, unitName: "Strip", contains: 10 },
    ],
  },
  {
    productId: "demo-005",
    productName: "Ibuprofen 400mg",
    unitPrice: 18000,
    stockAvailable: 80,
    category: "Obat Bebas",
    batchNumber: "IBU-2026-001",
    expiredDate: "2027-03-31",
    unit: "Tablet",
    unitLevels: [
      { level: 2, unitName: "Strip", contains: 10 },
    ],
  },
  {
    productId: "demo-006",
    productName: "Cetirizine 10mg",
    unitPrice: 22000,
    stockAvailable: 90,
    category: "Obat Bebas",
    batchNumber: "CET-2026-001",
    expiredDate: "2027-11-30",
    unit: "Tablet",
    unitLevels: [
      { level: 2, unitName: "Strip", contains: 10 },
    ],
  },
  {
    productId: "demo-007",
    productName: "Omeprazole 20mg",
    unitPrice: 28000,
    stockAvailable: 45,
    category: "Obat Keras",
    batchNumber: "OME-2026-001",
    expiredDate: "2027-01-31",
    unit: "Tablet",
    unitLevels: [
      { level: 2, unitName: "Strip", contains: 10 },
    ],
  },
  {
    productId: "demo-008",
    productName: "Salbutamol Inhaler",
    unitPrice: 55000,
    stockAvailable: 30,
    category: "Obat Keras",
    batchNumber: "SAL-2026-001",
    expiredDate: "2026-07-31",
    unit: "Inhaler",
  },
  {
    productId: "demo-009",
    productName: "Multivitamin Tablet",
    unitPrice: 42000,
    stockAvailable: 65,
    category: "Vitamin",
    batchNumber: "MLT-2026-001",
    expiredDate: "2027-08-31",
    unit: "Tablet",
    unitLevels: [
      { level: 2, unitName: "Strip", contains: 10 },
    ],
  },
  {
    productId: "demo-010",
    productName: "Minyak Kayu Putih",
    unitPrice: 20000,
    stockAvailable: 40,
    category: "Lainnya",
    batchNumber: "MKP-2026-001",
    expiredDate: "2028-06-30",
    unit: "Botol",
  },
] as const;

/** Catalog item type — same shape as demo products but fetched from DB. */
type ProductCatalogItem = DemoProduct;

/** Counter for demo invoice numbers — reset each day via date prefix. */
let _demoInvoiceDay = "";
let _demoInvoiceSeq = 0;

function generateDemoInvoice(): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  if (_demoInvoiceDay !== today) {
    _demoInvoiceDay = today;
    _demoInvoiceSeq = 0;
  }
  _demoInvoiceSeq++;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${today}-${String(_demoInvoiceSeq).padStart(3, "0")}-${rand}`;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useDemoCashier() {
  const store = useCashierStore();

  /** DB-fetched products (null = not loaded / fallback to DEMO_PRODUCTS). */
  const [dbProducts, setDbProducts] = useState<ProductCatalogItem[] | null>(
    null,
  );
  const [dbLoading, setDbLoading] = useState(false);

  /** True only when NEXT_PUBLIC_DEMO_MODE=true AND Supabase is not connected. */
  const isDemoMode = useMemo(() => checkDemoMode() && !productRepo.isConnected, []);

  /** Load products from the database when connected. */
  useEffect(() => {
    if (productRepo.isConnected && !dbProducts) {
      setDbLoading(true);
      productRepo
        .getProducts()
        .then((products) => {
          const items: ProductCatalogItem[] = products.map((p) => ({
            productId: p.id,
            productName: p.name,
            unitPrice: resolveCurrentSellingPrice(p.id, p.batches, p.defaultSellingPrice),
            stockAvailable: p.totalStock,
            category: p.category,
            batchNumber: p.batches[0]?.batchNumber ?? "",
            expiredDate: p.batches[0]?.expiredDate ?? "",
          }));
          setDbProducts(items);
        })
        .catch(() => setDbProducts(null))
        .finally(() => setDbLoading(false));
    }
  }, [dbProducts]);

  /** Create a new sale session with a unique invoice number. */
  const startDemoSale = useCallback(() => {
    const invoiceNumber = generateDemoInvoice();
    const saleId = `sale-${Date.now()}`;
    store.setCurrentSale(saleId, invoiceNumber);
  }, [store]);

  /** Add a demo product to the cart (quantity = 1).
   * @param product — Demo product to add
   * @param availableBatches — Optional batch snapshot from Inventory (passed by caller). */
  const addDemoProductToCart = useCallback(
    (product: DemoProduct, availableBatches?: ProductBatch[]) => {
      // V10.3 — canonical allocation + pricing (CV-1, CV-2, CV-3 resolved)
      const levels = product.unitLevels ?? [];
      const largestLevel = levels.length > 0
        ? levels.reduce((a, b) => a.level > b.level ? a : b)
        : null;
      const selectedUnit = largestLevel?.unitName ?? product.unit ?? undefined;
      const selectedUnitCode = selectedUnit?.trim().toLowerCase();
      const baseQty = selectedUnitCode && levels.length > 0
        ? toBaseUnit(1, selectedUnit!, levels)
        : 1;

      // V10.3: Build allocation + pricing via pure Domain Services
      // CV-1: NO inventory-store access
      // CV-2: NO direct allocateFefo() call
      // CV-3: sellingPrice lives in PriceSnapshot, not in AllocationDraft
      let allocationDraft: AllocationDraft | undefined;
      let priceSnapshot: PriceSnapshot | undefined;
      try {
        if (availableBatches && availableBatches.length > 0) {
          // 1. Allocate via AllocationBuilder (V10.2)
          allocationDraft = buildAllocation({
            productId: product.productId,
            baseQty,
            availableBatches,
          });

          // 2. Price via PricingEngine (V10.3)
          // Uses BatchPriceProvider adapter (V10.4 Story 2) — no inline adapter
          priceSnapshot = calculatePricing({
            allocationDraft,
            priceProvider: createBatchPriceProvider(availableBatches, product.unitPrice),
          });

          // Enrich batch numbers from actual batch data
          priceSnapshot = {
            ...priceSnapshot,
            entries: priceSnapshot.entries.map((entry) => {
              const batch = availableBatches.find((b) => b.id === entry.batchId);
              return {
                ...entry,
                batchNumber: batch?.batchNumber ?? entry.batchId.slice(-6),
              };
            }),
          };
        }
      } catch { /* demo/offline — no allocation/pricing available */ }

      // Canonical price from PriceSnapshot (not from allocation!)
      const snapshotPrice = priceSnapshot?.entries[0]?.sellingPrice;
      const canonicalPrice = snapshotPrice || product.unitPrice;

      const cartItem: CartItem = {
        productId: product.productId,
        productName: product.productName,
        // Canonical (V8-V10)
        baseQuantity: baseQty,
        baseUnitPrice: canonicalPrice,
        selectedUnitCode,
        // Allocation Draft (V10.2 — canonical, NO sellingPrice)
        allocationDraft,
        // Price Snapshot (V10.3 — canonical pricing, sellingPrice lives HERE)
        priceSnapshot,
        // Legacy (deprecated — V11.0 removal)
        quantity: 1,
        unitPrice: canonicalPrice,
        stockAvailable: product.stockAvailable,
        batchNumber: product.batchNumber,
        selectedUnit,
        displayQuantity: 1,
      };
      store.addToCart(cartItem);
    },
    [store],
  );

  /** Combine DB products (when loaded) or fall back to DEMO_PRODUCTS in demo mode. */
  const sourceProducts = useMemo(
    () => dbProducts ?? (checkDemoMode() ? DEMO_PRODUCTS : []),
    [dbProducts],
  );

  /** Products filtered by the current search query. */
  const filteredProducts = useMemo(() => {
    const query = store.searchQuery.toLowerCase().trim();
    if (!query) return [...sourceProducts];
    return sourceProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(query) ||
        p.productId.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query),
    );
  }, [store.searchQuery, sourceProducts]);

  /** All unique categories from demo products. */
  const categories = useMemo(
    () => [...new Set(DEMO_PRODUCTS.map((p) => p.category))],
    [],
  );

  /** Stable all-demo-products array reference. */
  const allDemoProducts = useMemo(() => [...DEMO_PRODUCTS], []);

  /** Reload products from Supabase — call after checkout to refresh stock counts. */
  const refreshProducts = useCallback(() => {
    if (productRepo.isConnected) {
      setDbLoading(true);
      productRepo.getProducts()
        .then((products) => {
          setDbProducts(products.map((p) => ({
            productId: p.id,
            productName: p.name,
            unitPrice: resolveCurrentSellingPrice(p.id, p.batches, p.defaultSellingPrice),
            stockAvailable: p.totalStock,
            category: p.category,
            batchNumber: p.batches[0]?.batchNumber ?? "",
            expiredDate: p.batches[0]?.expiredDate ?? "",
            unit: p.unit,
            unitLevels: p.unitLevels,
          })));
        })
        .catch(() => setDbProducts(null))
        .finally(() => setDbLoading(false));
    }
  }, []);

  return {
    isDemoMode,
    demoProducts: filteredProducts,
    allDemoProducts,
    categories,
    startDemoSale,
    addDemoProductToCart,
    refreshProducts,
  } as const;
}
