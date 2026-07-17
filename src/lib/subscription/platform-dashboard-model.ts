// ---------------------------------------------------------------------------
// Platform Dashboard ViewModel (PURE — NO business logic, NO I/O)
// ---------------------------------------------------------------------------
// Consumes already-fetched counts and returns structured KPI cards + attention
// items for the Super Admin dashboard. Stateless & unit-testable.
// ---------------------------------------------------------------------------

export interface KpiCard {
  key: string;
  label: string;
  value: number | string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  href?: string;
}

export interface AttentionItem {
  key: string;
  message: string;
  tone: "danger" | "warning" | "info";
  href: string;
}

export interface SleDashboardInput {
  totalTenants: number;
  byState: Record<string, number>; // lifecycle_state → count
  mrrEstimate: number;
  outstandingInvoiceCount: number;
  outstandingAmount: number;
  pendingTrialCount: number;
  failedSchedulerRunCount: number;
  overdueInvoiceCount: number;
}

export function sleKpiCards(input: SleDashboardInput): KpiCard[] {
  return [
    { key: "tenants", label: "Total Tenant", value: input.totalTenants, tone: "info" },
    { key: "active", label: "Aktif", value: input.byState.active ?? 0, tone: "success" },
    { key: "trial", label: "Trial", value: input.byState.trial_active ?? 0, tone: "info" },
    { key: "grace", label: "Grace / Read-Only", value: (input.byState.grace_period ?? 0) + (input.byState.read_only ?? 0), tone: "warning" },
    { key: "suspended", label: "Suspended", value: input.byState.suspended ?? 0, tone: "danger" },
    { key: "mrr", label: "MRR (estimasi)", value: `Rp ${input.mrrEstimate.toLocaleString("id-ID")}`, tone: "neutral" },
  ];
}

export function attentionItems(input: SleDashboardInput): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (input.pendingTrialCount > 0) {
    items.push({ key: "trials", message: `${input.pendingTrialCount} permintaan trial menunggu approval.`, tone: "warning", href: "/platform/trials" });
  }
  if (input.overdueInvoiceCount > 0) {
    items.push({ key: "overdue", message: `${input.overdueInvoiceCount} invoice jatuh tempo.`, tone: "danger", href: "/platform/billing" });
  }
  if (input.failedSchedulerRunCount > 0) {
    items.push({ key: "scheduler", message: `${input.failedSchedulerRunCount} scheduler run gagal.`, tone: "danger", href: "/platform/scheduler" });
  }
  if ((input.byState.grace_period ?? 0) > 0) {
    items.push({ key: "grace", message: `${input.byState.grace_period} tenant dalam masa tenggang.`, tone: "warning", href: "/platform/subscriptions" });
  }
  return items;
}
