// ---------------------------------------------------------------------------
// RC1.5 P0B — MPKB Listener
// ---------------------------------------------------------------------------
// Subscribes to ProductCreated events and processes candidate pipeline.
// Imported ONCE at app initialization. UI never touches this file.
// ---------------------------------------------------------------------------

import { onProductCreated, buildProductCreatedEvent, type ProductCreatedEvent } from "./events";
import { normalizeProductName, computeQualityScore } from "./product-create-hook";
import { normalizeIdentity } from "./identity-normalizer";

let initialized = false;

/**
 * Initialize MPKB listener. Call ONCE at app startup.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initMpkbListener(): void {
  if (initialized) return;
  initialized = true;

  onProductCreated(async (event: ProductCreatedEvent) => {
    try {
      const { supabase } = await import("@/lib/supabase/client");
      if (!supabase || !event.tenantId) return;

      const normalized = normalizeProductName(event.name);

      // 1. Check global library
      const { data: global } = await (supabase as any)
        .from("global_products")
        .select("id")
        .or(`name.ilike.${normalized},barcode.eq.${event.barcode || "__none__"}`)
        .maybeSingle();
      if (global) return;

      // 2. Check candidate pool (by normalized name)
      const { data: existing } = await (supabase as any)
        .from("candidate_products")
        .select("id, occurrence_count, tenant_usage_count, source_tenant_ids")
        .eq("normalized_name", normalized)
        .maybeSingle();

      if (existing) {
        const tenantIds: string[] = existing.source_tenant_ids ?? [];
        const isNewTenant = !tenantIds.includes(event.tenantId);
        const update: Record<string, unknown> = {
          occurrence_count: (existing.occurrence_count || 0) + 1,
          updated_at: new Date().toISOString(),
        };
        if (isNewTenant) {
          tenantIds.push(event.tenantId);
          update.tenant_usage_count = (existing.tenant_usage_count || 0) + 1;
          update.source_tenant_ids = tenantIds;
        }
        await (supabase as any).from("candidate_products").update(update).eq("id", existing.id);
        return;
      }

      // 3. Insert new candidate
      const score = computeQualityScore({
        barcode: event.barcode,
        manufacturer: event.manufacturer,
        strength: event.strength,
        dosageForm: event.dosageForm,
        unitLevels: event.unitLevels,
        tenantUsageCount: 1,
        manuallyApproved: false,
      });

      const identity = normalizeIdentity({ manufacturer: event.manufacturer, strength: event.strength, dosageForm: event.dosageForm });

      await (supabase as any).from("candidate_products").insert({
        source_tenant_id: event.tenantId,
        source_product_id: event.productId,
        source_type: event.sourceType,
        name: event.name,
        normalized_name: normalized,
        barcode: event.barcode,
        manufacturer: event.manufacturer,
        manufacturer_normalized: identity.manufacturerNormalized,
        strength: event.strength,
        strength_normalized: identity.strengthNormalized,
        dosage_form: event.dosageForm,
        dosage_form_code: identity.dosageFormCode,
        category: event.category,
        base_unit: event.baseUnit,
        unit_levels: event.unitLevels || null,
        quality_score: score,
        status: "pending",
        occurrence_count: 1,
        tenant_usage_count: 1,
        source_tenant_ids: [event.tenantId],
        submitted_at: new Date().toISOString(),
      });

    } catch {
      // Silent — never block product creation
    }
  });
}

/**
 * Emit product created event from the repository layer.
 * Call this from productRepo.createProduct() after successful save.
 */
export function emitProductCreatedFromRepo(params: {
  tenantId: string;
  productId: string;
  name: string;
  barcode?: string | null;
  manufacturer?: string | null;
  category: string;
  baseUnit: string;
  unitLevels?: import("@/types/unit").UnitLevel[];
  sourceType: import("./events").ProductSourceType;
}): void {
  const event = buildProductCreatedEvent(params);
  const { emitProductCreated } = require("./events");
  emitProductCreated(event);
}
