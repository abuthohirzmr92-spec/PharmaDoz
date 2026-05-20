"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useCashierStore, type CartItem } from "@/store/cashier-store";
import { productRepo } from "@/lib/repository-instances";
import { isDemoMode as checkDemoMode } from "@/config/env";

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
  },
  {
    productId: "demo-002",
    productName: "Amoxicillin 500mg",
    unitPrice: 25000,
    stockAvailable: 50,
    category: "Antibiotik",
    batchNumber: "AMX-2026-001",
    expiredDate: "2027-06-30",
  },
  {
    productId: "demo-003",
    productName: "Vitamin C 1000mg",
    unitPrice: 35000,
    stockAvailable: 75,
    category: "Vitamin",
    batchNumber: "VTC-2026-001",
    expiredDate: "2027-09-30",
  },
  {
    productId: "demo-004",
    productName: "Antasida Tablet",
    unitPrice: 12000,
    stockAvailable: 60,
    category: "Obat Bebas",
    batchNumber: "ANT-2026-001",
    expiredDate: "2026-08-31",
  },
  {
    productId: "demo-005",
    productName: "Ibuprofen 400mg",
    unitPrice: 18000,
    stockAvailable: 80,
    category: "Obat Bebas",
    batchNumber: "IBU-2026-001",
    expiredDate: "2027-03-31",
  },
  {
    productId: "demo-006",
    productName: "Cetirizine 10mg",
    unitPrice: 22000,
    stockAvailable: 90,
    category: "Obat Bebas",
    batchNumber: "CET-2026-001",
    expiredDate: "2027-11-30",
  },
  {
    productId: "demo-007",
    productName: "Omeprazole 20mg",
    unitPrice: 28000,
    stockAvailable: 45,
    category: "Obat Keras",
    batchNumber: "OME-2026-001",
    expiredDate: "2027-01-31",
  },
  {
    productId: "demo-008",
    productName: "Salbutamol Inhaler",
    unitPrice: 55000,
    stockAvailable: 30,
    category: "Obat Keras",
    batchNumber: "SAL-2026-001",
    expiredDate: "2026-07-31",
  },
  {
    productId: "demo-009",
    productName: "Multivitamin Tablet",
    unitPrice: 42000,
    stockAvailable: 65,
    category: "Vitamin",
    batchNumber: "MLT-2026-001",
    expiredDate: "2027-08-31",
  },
  {
    productId: "demo-010",
    productName: "Minyak Kayu Putih",
    unitPrice: 20000,
    stockAvailable: 40,
    category: "Lainnya",
    batchNumber: "MKP-2026-001",
    expiredDate: "2028-06-30",
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
  return `INV-${today}-${String(_demoInvoiceSeq).padStart(3, "0")}`;
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
            unitPrice: p.batches[0]?.sellingPrice ?? 0,
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

  /** Add a demo product to the cart (quantity = 1). */
  const addDemoProductToCart = useCallback(
    (product: DemoProduct) => {
      const cartItem: CartItem = {
        productId: product.productId,
        productName: product.productName,
        quantity: 1,
        unitPrice: product.unitPrice,
        stockAvailable: product.stockAvailable,
        batchNumber: product.batchNumber,
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

  return {
    isDemoMode,
    demoProducts: filteredProducts,
    allDemoProducts,
    categories,
    startDemoSale,
    addDemoProductToCart,
  } as const;
}
