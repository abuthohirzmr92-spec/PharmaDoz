"use server";

import { getServiceRoleClient } from "@/lib/supabase/client-factory";
import { PromotionRepository } from "@/lib/repositories/promotion";

async function createPromoRepo(): Promise<PromotionRepository> {
  return new PromotionRepository(getServiceRoleClient());
}

export async function createPromotion(input: {
  code: string;
  label?: string;
  type: "percent" | "fixed" | "trial_extension";
  value: number;
  minAmount?: number;
  maxDiscount?: number;
  appliesToPlanId?: string;
  validFrom?: string;
  validTo?: string;
  maxRedemptions?: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const repo = await createPromoRepo();
    await repo.create(input);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "create_failed" };
  }
}

export async function togglePromotionStatus(code: string, isActive: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const repo = await createPromoRepo();
    // Update via raw call since the repo doesn't have an update method yet
    const client = getServiceRoleClient();
    const { error } = await client
      .from("marketing_promotions")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("code", code);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "toggle_failed" };
  }
}
