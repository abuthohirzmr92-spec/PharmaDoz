"use client";

import { useState, useEffect } from "react";
import { useProductStore } from "@/store/product-store";
import type { UnitLevel } from "@/types/unit";

// ─── Types ───

export interface ProductCatalogEntry {
  unit: string;
  unitLevels: UnitLevel[];
  defaultPrice: number;
  defaultSellingPrice: number;
  category: string;
  barcode: string | null;
}

export type ProductCatalog = Map<string, ProductCatalogEntry>;

export interface ProductCatalogState {
  catalog: ProductCatalog;
  isLoading: boolean;
}

// ─── Hook ───

/**
 * Single source of truth for the Product Catalog.
 * Database-driven only — Supabase is the canonical source.
 *
 * ADR-007: Product Catalog is INDEPENDENT from Inventory Batch state.
 *
 * Returns { catalog, isLoading } so consumers can wait for the
 * initial load before rendering fallback units.
 */
export function useProductCatalog(): ProductCatalogState {
  const productStore = useProductStore();

  const [catalog, setCatalog] = useState<ProductCatalog>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!productStore.isConnected) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let cancelled = false;
    productStore
      .loadCatalog()
      .then((products) => {
        if (cancelled) return;
        const map = new Map<string, ProductCatalogEntry>();
        for (const p of products) {
          map.set(p.id, {
            unit: p.unit ?? "Pcs",
            unitLevels: (p.unitLevels as UnitLevel[]) ?? [],
            defaultPrice: p.defaultPrice ?? 0,
            defaultSellingPrice: p.defaultSellingPrice ?? 0,
            category: p.category ?? "",
            barcode: p.barcode ?? null,
          });
        }
        setCatalog(map);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [productStore.isConnected]);

  return { catalog, isLoading };
}
