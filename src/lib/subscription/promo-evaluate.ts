// ---------------------------------------------------------------------------
// promoOutcome — explain why a promotion is accepted or rejected (PURE)
// ---------------------------------------------------------------------------
// Presentation helper mirroring PromotionRepository validity, returning a
// granular reason for clear UX messaging. No money math, no side effects.
// ---------------------------------------------------------------------------

export type PromoStatus =
  | "applied"
  | "not_found"
  | "inactive"
  | "not_yet_valid"
  | "expired"
  | "exhausted"
  | "plan_mismatch"
  | "min_not_met";

export interface PromoInputFields {
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  appliesToPlanId: string | null;
  minAmount: number | null;
}

export interface PromoOutcome {
  status: PromoStatus;
  message: string;
  applied: boolean;
}

export function promoOutcome(
  promo: PromoInputFields | null,
  ctx: { nowISO: string; amount: number; planId: string | null },
): PromoOutcome {
  if (!promo) return { status: "not_found", message: "Kode promo tidak ditemukan.", applied: false };
  if (!promo.isActive) return { status: "inactive", message: "Promo sedang tidak aktif.", applied: false };

  const now = Date.parse(ctx.nowISO);
  if (promo.validFrom && Date.parse(promo.validFrom) > now) {
    return { status: "not_yet_valid", message: "Promo belum mulai berlaku.", applied: false };
  }
  if (promo.validTo && Date.parse(promo.validTo) <= now) {
    return { status: "expired", message: "Promo sudah kedaluwarsa.", applied: false };
  }
  if (promo.maxRedemptions != null && promo.redeemedCount >= promo.maxRedemptions) {
    return { status: "exhausted", message: "Kuota promo sudah habis.", applied: false };
  }
  if (promo.appliesToPlanId && ctx.planId && promo.appliesToPlanId !== ctx.planId) {
    return { status: "plan_mismatch", message: "Promo tidak berlaku untuk paket ini.", applied: false };
  }
  if (promo.minAmount != null && ctx.amount < promo.minAmount) {
    return { status: "min_not_met", message: "Nilai transaksi belum memenuhi minimum promo.", applied: false };
  }
  return { status: "applied", message: "Promo berhasil diterapkan.", applied: true };
}
