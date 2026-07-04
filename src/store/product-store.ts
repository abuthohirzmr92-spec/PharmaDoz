// =================================================================
// Product Store — Repository Compliance Layer
// EEOS V5 Constitution Article 8: No Database Access From UI
// All productRepo access MUST go through this store.
// =================================================================

import { create } from "zustand";
import { productRepo } from "@/lib/repository-instances";
import type { ProductBatch } from "@/types/inventory";

interface ProductCatalogItem {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  unit?: string;
  defaultPrice?: number;
  defaultSellingPrice?: number;
  unitLevels?: Array<{ level: number; unitName: string; contains: number }>;
  defaultStorageAreaId?: string | null;
  defaultStorageSlot?: string | null;
  isActive?: boolean;
  batches?: ProductBatch[];
}

interface ProductStoreState {
  catalog: ProductCatalogItem[];
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string }>;
  isLoading: boolean;
  isConnected: boolean;

  // Read operations — thin wrappers around productRepo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadRawProducts: (filter?: { isActive?: boolean }) => Promise<any[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadCatalog: (filter?: { isActive?: boolean }) => Promise<any[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadPurchaseProducts: (filter?: { isActive?: boolean }) => Promise<any[]>;
  loadCategories: () => Promise<Array<{ id: string; name: string }>>;
  loadUnits: () => Promise<Array<{ id: string; name: string }>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadUnitLevels: (productId: string) => Promise<any[]>;
  getTenantId: () => string | null;

  // Write operations — thin wrappers around productRepo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createProduct: (data: Record<string, any>) => Promise<any>;
  updateProduct: (id: string, data: Record<string, unknown>) => Promise<any>;
  createCategory: (name: string) => Promise<{ id: string; name: string }>;
}

export const useProductStore = create<ProductStoreState>((set, get) => ({
  catalog: [],
  categories: [],
  units: [],
  isLoading: false,
  isConnected: typeof window !== "undefined" ? (productRepo as any).isConnected : false,

  // ── Reads ──

  loadRawProducts: async (filter) => {
    set({ isLoading: true });
    try {
      const products = await (productRepo as any).getRawProducts(filter ?? { isActive: true });
      set({ isLoading: false, isConnected: (productRepo as any).isConnected });
      return products as any[];
    } catch {
      set({ isLoading: false });
      return [];
    }
  },

  // Purchase-specific: includes unitLevels for multi-unit dropdown
  loadPurchaseProducts: async (filter) => {
    set({ isLoading: true });
    try {
      const products = await (productRepo as any).getProducts(filter);
      const mapped = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        defaultPrice: p.defaultPrice ?? 0,
        defaultSellingPrice: p.defaultSellingPrice ?? 0,
        unit: p.unit ?? "",
        unitLevels: p.unitLevels ?? [],
        defaultStorageAreaId: p.defaultStorageAreaId ?? null,
        defaultStorageSlot: p.defaultStorageSlot ?? null,
      }));
      set({ isLoading: false, isConnected: (productRepo as any).isConnected });
      return mapped;
    } catch {
      set({ isLoading: false });
      return [];
    }
  },

  loadCatalog: async (filter) => {
    set({ isLoading: true });
    try {
      const products = await (productRepo as any).getProducts();
      const catalog = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        unit: p.unit,
        defaultPrice: p.defaultPrice,
        defaultSellingPrice: p.defaultSellingPrice,
        unitLevels: p.unitLevels ?? [],
        defaultStorageAreaId: p.defaultStorageAreaId,
        defaultStorageSlot: p.defaultStorageSlot,
        isActive: p.isActive,
        batches: p.batches ?? [],
      }));
      const filtered = filter?.isActive !== undefined
        ? catalog.filter((p: any) => p.isActive === filter.isActive)
        : catalog;
      set({ catalog: filtered, isLoading: false, isConnected: (productRepo as any).isConnected });
      return filtered;
    } catch {
      set({ isLoading: false });
      return [];
    }
  },

  loadCategories: async () => {
    try {
      const cats = await (productRepo as any).getCategories();
      set({ categories: cats });
      return cats;
    } catch {
      return [];
    }
  },

  loadUnits: async () => {
    try {
      const units = await (productRepo as any).getUnits();
      set({ units });
      return units;
    } catch {
      return [];
    }
  },

  loadUnitLevels: async (productId) => {
    try {
      return await (productRepo as any).getUnitLevels(productId);
    } catch {
      return [];
    }
  },

  getTenantId: () => {
    return (productRepo as any).getTenantId() ?? null;
  },

  // ── Writes ──

  createProduct: async (data) => {
    const created = await (productRepo as any).createProduct(data);
    await get().loadCatalog();
    return created;
  },

  updateProduct: async (id, data) => {
    const result = await (productRepo as any).updateProduct(id, data);
    await get().loadCatalog();
    return result ?? {};
  },

  createCategory: async (name) => {
    const cat = await (productRepo as any).createCategory(name);
    await get().loadCategories();
    return cat;
  },
}));
