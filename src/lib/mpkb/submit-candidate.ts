// ---------------------------------------------------------------------------
// RC1.5 P0 — MPKB Background Candidate Submission
// ---------------------------------------------------------------------------
// Non-blocking. Failure is silently ignored. Never interrupts tenant flow.
// ---------------------------------------------------------------------------

import type { UnitLevel } from "@/types/unit";
import type { CandidateSourceType } from "@/types/product-knowledge";

interface CandidatePayload {
  sourceTenantId: string;
  sourceProductId: string;
  sourceType: CandidateSourceType;
  name: string;
  barcode?: string | null;
  manufacturer?: string | null;
  category: string;
  baseUnit: string;
  unitLevels?: UnitLevel[];
}

/**
 * Submit product to candidate pool (background — non-blocking).
 *
 * Flow:
 *   1. Check global library → skip if found
 *   2. Check existing candidates → skip if duplicate (increment counter)
 *   3. Insert new candidate with status=pending
 *
 * Failures are SILENTLY ignored — tenant operations continue unaffected.
 */
export async function submitCandidateProduct(payload: CandidatePayload): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    if (!supabase) return;

    const tenantId = payload.sourceTenantId;
    if (!tenantId) return;

    // 1. Check if already in global library
    const { data: existing } = await (supabase as any)
      .from("global_products")
      .select("id")
      .or(`name.eq.${payload.name},barcode.eq.${payload.barcode || ""}`)
      .maybeSingle();
    if (existing) return; // Already global — nothing to do

    // 2. Check if candidate already exists — increment occurrence
    const { data: existingCandidate } = await (supabase as any)
      .from("candidate_products")
      .select("id, occurrence_count, tenant_usage_count")
      .eq("name", payload.name)
      .maybeSingle();

    if (existingCandidate) {
      await (supabase as any)
        .from("candidate_products")
        .update({
          occurrence_count: (existingCandidate.occurrence_count || 0) + 1,
          tenant_usage_count: (existingCandidate.tenant_usage_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCandidate.id);
      return;
    }

    // 3. Insert new candidate
    await (supabase as any).from("candidate_products").insert({
      source_tenant_id: tenantId,
      source_product_id: payload.sourceProductId,
      source_type: payload.sourceType,
      name: payload.name,
      barcode: payload.barcode || null,
      manufacturer: payload.manufacturer || null,
      category: payload.category,
      base_unit: payload.baseUnit,
      unit_levels: payload.unitLevels || null,
      status: "pending",
      occurrence_count: 1,
      tenant_usage_count: 1,
      submitted_at: new Date().toISOString(),
    });

  } catch {
    // Silent failure — never block tenant operations
  }
}

/**
 * Batch submit multiple products (e.g. after Excel import).
 * Each submission is independent — one failure doesn't affect others.
 */
export async function submitCandidateBatch(
  payloads: CandidatePayload[],
): Promise<void> {
  for (const p of payloads) {
    await submitCandidateProduct(p).catch(() => {});
  }
}
