import { BaseRepository, mapRow } from "./base";

// ---------------------------------------------------------------------------
// PromotionRepository — Marketing Engine (offers). Migration 061.
// ---------------------------------------------------------------------------
// OFFERS side only (see marketing-vs-billing-context): validates/resolves a
// promotion. Discount math + final price belong to the Billing Engine (Phase 5).
// ---------------------------------------------------------------------------

export interface PromotionOffer {
  code: string;
  label: string | null;
  type: "percent" | "fixed" | "trial_extension";
  value: number;
  minAmount: number | null;
  maxDiscount: number | null;
  appliesToPlanId: string | null;
  validFrom: string | null;
  validTo: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  isActive: boolean;
}

interface PromoValidityRow {
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  max_redemptions: number | null;
  redeemed_count: number;
}

/** Pure: is a promotion currently redeemable? (Marketing-side validity only.) */
export function isPromotionValid(p: PromoValidityRow, nowISO: string): boolean {
  if (!p.is_active) return false;
  const now = Date.parse(nowISO);
  if (p.valid_from && Date.parse(p.valid_from) > now) return false;
  if (p.valid_to && Date.parse(p.valid_to) <= now) return false;
  if (p.max_redemptions !== null && p.redeemed_count >= p.max_redemptions) return false;
  return true;
}

const COLS =
  "code, label, type, value, min_amount, max_discount, applies_to_plan_id, " +
  "valid_from, valid_to, max_redemptions, redeemed_count, is_active";

export class PromotionRepository extends BaseRepository {
  async getByCode(code: string): Promise<PromotionOffer | null> {
    if (!this.isConnected) return null;
    const { data, error } = await this.client
      .from("marketing_promotions")
      .select(COLS)
      .eq("code", code)
      .maybeSingle();
    if (error) return this.handleError(error, "PromotionRepository.getByCode");
    return data ? mapRow<PromotionOffer>(data as Record<string, unknown>) : null;
  }

  /** Resolve a code to a valid offer (Marketing side), or null if not redeemable. */
  async resolveValidOffer(code: string): Promise<PromotionOffer | null> {
    const offer = await this.getByCode(code);
    if (!offer) return null;
    const valid = isPromotionValid(
      {
        is_active: offer.isActive,
        valid_from: offer.validFrom,
        valid_to: offer.validTo,
        max_redemptions: offer.maxRedemptions,
        redeemed_count: offer.redeemedCount,
      },
      new Date().toISOString(),
    );
    return valid ? offer : null;
  }

  /** Create a new promotion code. Returns the inserted offer or throws. */
  async create(input: {
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
  }): Promise<PromotionOffer> {
    if (!this.isConnected) throw new Error("Repository tidak terhubung ke database.");
    const { data, error } = await this.client
      .from("marketing_promotions")
      .insert({
        code: input.code,
        label: input.label ?? null,
        type: input.type,
        value: input.value,
        min_amount: input.minAmount ?? null,
        max_discount: input.maxDiscount ?? null,
        applies_to_plan_id: input.appliesToPlanId ?? null,
        valid_from: input.validFrom ?? null,
        valid_to: input.validTo ?? null,
        max_redemptions: input.maxRedemptions ?? null,
        redeemed_count: 0,
        is_active: true,
      })
      .select(COLS)
      .single();
    if (error) return this.handleError(error, "PromotionRepository.create");
    return mapRow<PromotionOffer>(data as Record<string, unknown>);
  }

  /** List all promotions (active + inactive). Paginated at the application layer. */
  async listAll(): Promise<PromotionOffer[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("marketing_promotions")
      .select(COLS)
      .order("code", { ascending: true });
    if (error) return this.handleError(error, "PromotionRepository.listAll");
    return (data ?? []).map((row: Record<string, unknown>) => mapRow<PromotionOffer>(row));
  }

  /**
   * Increment a promotion's redemption counter (frozen-schema redemption
   * record). NOTE: read-modify-write — not atomic under concurrency; a
   * dedicated redemption table / atomic RPC is a documented CR candidate.
   */
  async incrementRedeemed(code: string): Promise<void> {
    if (!this.isConnected) return;
    const current = await this.getByCode(code);
    if (!current) return;
    const { error } = await this.client
      .from("marketing_promotions")
      .update({ redeemed_count: current.redeemedCount + 1, updated_at: new Date().toISOString() })
      .eq("code", code);
    if (error) return this.handleError(error, "PromotionRepository.incrementRedeemed");
  }
}
