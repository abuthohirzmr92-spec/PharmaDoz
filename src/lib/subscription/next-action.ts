// ---------------------------------------------------------------------------
// deriveNextAction — Next Action Card ViewModel helper (PURE, stateless)
// ---------------------------------------------------------------------------
// Reads ALREADY-COMPUTED subscription state and returns a message + CTA for the
// dashboard. This is a VIEWMODEL helper only — it MUST NEVER contain business
// decisions. Business logic lives in the domain services. Pure & unit-testable.
// ---------------------------------------------------------------------------

export type NextActionKind =
  | "pay_overdue"
  | "pay_grace"
  | "trial_expiring"
  | "renew_soon"
  | "upgrade_recommended"
  | "none";

export type NextActionTone = "info" | "warning" | "danger" | "success";

export interface NextAction {
  kind: NextActionKind;
  message: string;
  cta: string | null;
  href: string | null;
  tone: NextActionTone;
}

export interface NextActionContext {
  lifecycleState: string | null;
  daysRemaining: number | null; // to trial_end / current_period_end
  hasOverdueInvoice: boolean;
  quotaNearLimit: boolean; // any resource at/over ~90%
}

const BILLING = "/settings/subscription/billing";
const UPGRADE = "/settings/subscription/upgrade";
const PLANS = "/settings/subscription/plans";

export function deriveNextAction(ctx: NextActionContext): NextAction {
  if (ctx.hasOverdueInvoice) {
    return { kind: "pay_overdue", message: "Anda memiliki tagihan yang jatuh tempo.", cta: "Bayar Sekarang", href: BILLING, tone: "danger" };
  }
  if (ctx.lifecycleState === "grace_period" || ctx.lifecycleState === "read_only") {
    return { kind: "pay_grace", message: "Langganan dalam masa tenggang — segera bayar untuk memulihkan akses penuh.", cta: "Bayar Sekarang", href: BILLING, tone: "danger" };
  }
  if (ctx.lifecycleState === "trial_active" && ctx.daysRemaining !== null && ctx.daysRemaining <= 1) {
    const msg = ctx.daysRemaining <= 0 ? "Trial Anda berakhir hari ini." : "Trial Anda berakhir besok.";
    return { kind: "trial_expiring", message: msg, cta: "Upgrade Paket", href: UPGRADE, tone: "warning" };
  }
  if (ctx.lifecycleState === "active" && ctx.daysRemaining !== null && ctx.daysRemaining <= 5) {
    return { kind: "renew_soon", message: `Perpanjang dalam ${Math.max(0, ctx.daysRemaining)} hari.`, cta: "Bayar Sekarang", href: BILLING, tone: "warning" };
  }
  if (ctx.quotaNearLimit) {
    return { kind: "upgrade_recommended", message: "Penggunaan Anda mendekati batas paket.", cta: "Bandingkan Paket", href: PLANS, tone: "info" };
  }
  return { kind: "none", message: "Langganan Anda sehat. Tidak ada tindakan yang diperlukan.", cta: null, href: null, tone: "success" };
}
