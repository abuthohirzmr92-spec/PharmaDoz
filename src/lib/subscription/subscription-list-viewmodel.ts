// ---------------------------------------------------------------------------
// Subscription List ViewModel (PURE — NO business logic, NO I/O)
// ---------------------------------------------------------------------------
// Consumes already-fetched tenant + subscription rows and returns
// presentation-ready data for the subscription management table.
// ---------------------------------------------------------------------------

import type { TenantSubscriptionRow } from "@/types/subscription-dtos";

export interface SubscriptionTableRow {
  tenantId: string;
  tenantName: string;
  packageName: string | null;
  lifecycleState: string | null;
  subscriptionId: string | null;
  stateTone: "success" | "warning" | "danger" | "info" | "neutral";
  health: { health: string; icon: string; label: string };
  actions: SubscriptionActions;
}

export interface SubscriptionActions {
  canSuspend: boolean;
  canReactivate: boolean;
  canCancel: boolean;
}

/** Map lifecycle state → badge tone. Pure. */
export function lifecycleStateTone(s: string | null): "success" | "warning" | "danger" | "info" | "neutral" {
  if (!s) return "neutral";
  if (["active", "converted"].includes(s)) return "success";
  if (["trial_active"].includes(s)) return "info";
  if (["grace_period", "read_only", "expired", "trial_expired"].includes(s)) return "warning";
  if (["suspended", "terminated"].includes(s)) return "danger";
  return "neutral";
}

/** Which lifecycle actions are available for a given state. Pure. */
export function availableActions(lifecycleState: string | null): SubscriptionActions {
  const s = lifecycleState;
  return {
    canSuspend: s !== null && ["active", "trial_active", "grace_period"].includes(s),
    canReactivate: s !== null && ["suspended"].includes(s),
    canCancel: s !== null && ["active", "trial_active", "grace_period", "suspended", "expired"].includes(s),
  };
}

/** Compute a health score from lifecycle state + billing flags. Pure. */
export function computeHealth(input: {
  lifecycleState: string | null;
  hasOverdueInvoice: boolean;
  hasSentInvoice: boolean;
}): { health: string; icon: string; label: string } {
  const critical = ["suspended", "terminated"];
  const attention = ["grace_period", "read_only"];

  if (critical.includes(input.lifecycleState ?? "") || input.hasOverdueInvoice) {
    return { health: "critical", icon: "🔴", label: "Kritis" };
  }
  if (attention.includes(input.lifecycleState ?? "") || input.hasSentInvoice) {
    return { health: "attention", icon: "🟡", label: "Perlu Perhatian" };
  }
  if (input.lifecycleState === "trial_active" || input.lifecycleState === "expired") {
    return { health: "attention", icon: "⚪", label: input.lifecycleState === "trial_active" ? "Trial Aktif" : "Kedaluwarsa" };
  }
  return { health: "healthy", icon: "🟢", label: "Sehat" };
}

/** Transform raw rows into presentation-ready table rows. Pure. */
export function buildSubscriptionTableRows(
  tenants: TenantSubscriptionRow[],
): SubscriptionTableRow[] {
  return tenants.map((t) => {
    const health = computeHealth({
      lifecycleState: t.lifecycleState,
      hasOverdueInvoice: false,
      hasSentInvoice: false,
    });
    return {
      tenantId: t.tenantId,
      tenantName: t.tenantName,
      packageName: t.packageName,
      lifecycleState: t.lifecycleState,
      subscriptionId: t.subscriptionId,
      stateTone: lifecycleStateTone(t.lifecycleState),
      health,
      actions: availableActions(t.lifecycleState),
    };
  });
}
