// ---------------------------------------------------------------------------
// Tenant health ViewModel (PURE) — single-tenant operational health indicator
// ---------------------------------------------------------------------------
// Summarizes subscription state + outstanding invoices into one health score.
// Presentation-only; NO business logic or I/O.
// ---------------------------------------------------------------------------

export type TenantHealth = "healthy" | "attention" | "critical";

export interface TenantHealthScore {
  health: TenantHealth;
  icon: string;
  label: string;
}

export function tenantHealthScore(input: {
  lifecycleState: string | null;
  hasOverdueInvoice: boolean;
  hasSentInvoice: boolean;
}): TenantHealthScore {
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

export interface TenantBillingSummary {
  overdue: number;
  sent: number;
  paid: number;
  total: number;
}

export function tenantBillingSummary(invoices: { status: string }[]): TenantBillingSummary {
  const byStatus = (s: string) => invoices.filter((i) => i.status === s).length;
  return {
    overdue: byStatus("overdue"),
    sent: byStatus("sent"),
    paid: byStatus("paid"),
    total: invoices.length,
  };
}
