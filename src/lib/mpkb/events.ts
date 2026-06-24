// ---------------------------------------------------------------------------
// RC1.5 P0B — MPKB Event System
// ---------------------------------------------------------------------------
// Decouples UI from MPKB. All product creation paths emit the same event.
// UI components MUST NOT import MPKB directly.
// ---------------------------------------------------------------------------

import type { UnitLevel } from "@/types/unit";

// ============================================================================
// Event Types
// ============================================================================

export type ProductSourceType = "manual" | "excel_import" | "ocr_import" | "api_import" | "copy" | "migration";

export interface ProductCreatedEvent {
  eventId: string;
  tenantId: string;
  productId: string;
  name: string;
  barcode: string | null;
  manufacturer?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  category: string;
  /** RC1.5 P0C — category UUID (optional, backward compatible) */
  categoryId?: string;
  baseUnit: string;
  unitLevels?: UnitLevel[];
  sourceType: ProductSourceType;
  createdAt: string;
}

// ============================================================================
// Event Emitter (single entry point)
// ============================================================================

type ProductCreatedListener = (event: ProductCreatedEvent) => void;

const listeners: ProductCreatedListener[] = [];

/**
 * Register a listener for product creation events.
 * Called by MPKB module on initialization.
 */
export function onProductCreated(listener: ProductCreatedListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Emit product creation event. Non-blocking.
 * All listeners run asynchronously in a microtask.
 * Failure in any listener does NOT affect the caller.
 */
export function emitProductCreated(event: ProductCreatedEvent): void {
  // Run listeners in microtask — non-blocking
  Promise.resolve().then(() => {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // Silent — listener failure must never propagate
      }
    }
  });
}

// ============================================================================
// Helper: build event from createProduct params
// ============================================================================

export function buildProductCreatedEvent(params: {
  tenantId: string;
  productId: string;
  name: string;
  barcode?: string | null;
  manufacturer?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  category?: string;
  categoryId?: string;
  baseUnit: string;
  unitLevels?: UnitLevel[];
  sourceType: ProductSourceType;
}): ProductCreatedEvent {
  return {
    eventId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tenantId: params.tenantId,
    productId: params.productId,
    name: params.name.trim(),
    barcode: params.barcode?.trim() || null,
    manufacturer: params.manufacturer || null,
    category: params.category || "",
    categoryId: params.categoryId,
    baseUnit: params.baseUnit,
    unitLevels: params.unitLevels,
    sourceType: params.sourceType,
    createdAt: new Date().toISOString(),
  };
}
