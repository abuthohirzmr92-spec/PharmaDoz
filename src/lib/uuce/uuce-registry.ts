// =================================================================
// UUCE Registry — Tree cache for fast unit conversion
// EEOS Business Core — Layer 0 Foundation
// =================================================================

import type { UnitTree } from "./uuce-types";
import { buildTree } from "./uuce-tree";

// ─── Tree Cache ───

const treeCache = new Map<string, UnitTree>();

/**
 * Get a UnitTree for a product.
 * Returns cached tree if available, otherwise builds and caches.
 */
export function getTree(
  productId: string,
  unitLevels?: Array<{
    id?: string;
    level: number;
    unitName: string;
    contains: number;
    parentUnitName?: string;
    metadata?: Record<string, unknown>;
  }>,
  baseUnit?: string,
): UnitTree {
  const cached = treeCache.get(productId);
  if (cached) return cached;

  if (!unitLevels || !baseUnit) {
    throw new Error(
      `UUCE: Tree not cached for product "${productId}" and no unitLevels/baseUnit provided to build it.`,
    );
  }

  return buildAndCache(productId, baseUnit, unitLevels);
}

/**
 * Build a tree from data and cache it.
 */
export function buildAndCache(
  productId: string,
  baseUnit: string,
  unitLevels: Array<{
    id?: string;
    level: number;
    unitName: string;
    contains: number;
    parentUnitName?: string;
    metadata?: Record<string, unknown>;
  }>,
  treeVersion?: number,
): UnitTree {
  const tree = buildTree({ productId, baseUnit, unitLevels, treeVersion });
  treeCache.set(productId, tree);
  return tree;
}

/**
 * Preload multiple product trees (batch warm-up).
 */
export function preload(
  products: Array<{
    productId: string;
    baseUnit: string;
    unitLevels: Array<{
      id?: string;
      level: number;
      unitName: string;
      contains: number;
      parentUnitName?: string;
      metadata?: Record<string, unknown>;
    }>;
  }>,
): void {
  for (const p of products) {
    if (!treeCache.has(p.productId)) {
      buildAndCache(p.productId, p.baseUnit, p.unitLevels);
    }
  }
}

/**
 * Invalidate cached tree for a product.
 * Called when product unit levels are updated.
 */
export function invalidate(productId: string): void {
  treeCache.delete(productId);
}

/**
 * Invalidate all cached trees.
 */
export function invalidateAll(): void {
  treeCache.clear();
}

/**
 * Get cache stats.
 */
export function getCacheStats(): { size: number; productIds: string[] } {
  return {
    size: treeCache.size,
    productIds: Array.from(treeCache.keys()),
  };
}
