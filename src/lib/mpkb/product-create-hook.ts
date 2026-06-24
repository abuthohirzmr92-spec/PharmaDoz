// ---------------------------------------------------------------------------
// RC1.5 P0A — Centralized MPKB After-Create Hook
// ---------------------------------------------------------------------------
// Single entry point for all product creation paths.
// UI components MUST NOT call submitCandidateProduct directly.
// Future entry points (OCR, API, Copy, Migration) call this hook.
// ---------------------------------------------------------------------------

import type { UnitLevel } from "@/types/unit";
import { supabase } from "@/lib/supabase/client";

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize product name for deduplication.
 * Lowercase, trim, collapse spaces.
 */
export function normalizeProductName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// ============================================================================
// Quality Score Engine (pure function)
// ============================================================================

// RC1.5 P1F.1 — Approved quality score formula
export function computeQualityScore(product: {
  barcode?: string | null;
  manufacturer?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  unitLevels?: UnitLevel[];
  tenantUsageCount?: number;
  manuallyApproved?: boolean;
}): number {
  let score = 0;
  if (product.barcode) score += 10;
  if (product.manufacturer) score += 10;
  if (product.strength) score += 5;
  if (product.dosageForm) score += 5;
  if (product.unitLevels && product.unitLevels.length > 0) score += 15;
  const count = product.tenantUsageCount ?? 0;
  if (count >= 3) score += 30;
  else if (count >= 1) score += 10;
  if (product.manuallyApproved) score += 20;
  return Math.min(100, score);
}

// ============================================================================
// Centralized After-Create Hook
// ============================================================================

export interface MpkbProductPayload {
  tenantId: string;
  productId: string;
  sourceType: "manual" | "excel_import" | "ocr_import" | "api_import" | "migration";
  name: string;
  barcode?: string | null;
  manufacturer?: string | null;
  category: string;
  baseUnit: string;
  unitLevels?: UnitLevel[];
}

/**
 * Submit single product to MPKB candidate pool.
 * NON-BLOCKING — failure silently ignored.
 */
export async function afterProductCreate(payload: MpkbProductPayload): Promise<void> {
  try {
    if (!payload.tenantId || !payload.productId || !payload.name) return;

    const normalized = normalizeProductName(payload.name);

    // 1. Check global library (using normalized name)
    const { data: global } = await (supabase as any)
      .from("global_products")
      .select("id")
      .or(`name.ilike.${normalized},barcode.eq.${payload.barcode || "__none__"}`)
      .maybeSingle();
    if (global) return; // Already in global — nothing to submit

    // 2. Check existing candidate (using normalized name)
    const { data: existing } = await (supabase as any)
      .from("candidate_products")
      .select("id, occurrence_count, tenant_usage_count, source_tenant_ids")
      .eq("normalized_name", normalized)
      .maybeSingle();

    if (existing) {
      // Increment occurrence (always) and tenant usage (if new tenant)
      const tenantIds: string[] = existing.source_tenant_ids ?? [];
      const isNewTenant = !tenantIds.includes(payload.tenantId);
      const updateData: Record<string, unknown> = {
        occurrence_count: (existing.occurrence_count || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      if (isNewTenant) {
        tenantIds.push(payload.tenantId);
        updateData.tenant_usage_count = (existing.tenant_usage_count || 0) + 1;
        updateData.source_tenant_ids = tenantIds;
      }
      await (supabase as any).from("candidate_products").update(updateData).eq("id", existing.id);
      return;
    }

    // 3. Insert new candidate
    const score = computeQualityScore({
      barcode: payload.barcode,
      manufacturer: payload.manufacturer,
      unitLevels: payload.unitLevels,
      tenantUsageCount: 1,
      manuallyApproved: false,
    });

    await (supabase as any).from("candidate_products").insert({
      source_tenant_id: payload.tenantId,
      source_product_id: payload.productId,
      source_type: payload.sourceType,
      name: payload.name,
      normalized_name: normalized,
      barcode: payload.barcode || null,
      manufacturer: payload.manufacturer || null,
      category: payload.category,
      base_unit: payload.baseUnit,
      unit_levels: payload.unitLevels || null,
      quality_score: score,
      status: "pending",
      occurrence_count: 1,
      tenant_usage_count: 1,
      source_tenant_ids: [payload.tenantId],
      submitted_at: new Date().toISOString(),
    });

  } catch {
    // Silent — never block product creation
  }
}

/**
 * Batch submit (e.g. after Excel import).
 * Each submission independent.
 */
export async function afterProductBatchCreate(payloads: MpkbProductPayload[]): Promise<void> {
  for (const p of payloads) {
    await afterProductCreate(p).catch(() => {});
  }
}
