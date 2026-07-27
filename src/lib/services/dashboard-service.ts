import {
  superAdminRepo as defaultSuperAdmin,
  invoiceRepo as defaultInvoice,
  trialRequestRepo as defaultTrial,
  schedulerRunRepo as defaultScheduler,
} from "@/lib/repository-instances";
import type { SuperAdminRepository } from "@/lib/repositories/super-admin";
import type { InvoiceRepository, InvoiceRecord } from "@/lib/repositories/invoice";
import type { TrialRequestRepository } from "@/lib/repositories/trial-request";
import type { SchedulerRunRepository } from "@/lib/repositories/scheduler-run";
import type { PlatformOverview, BillingOverview, InvoiceSummaryRow } from "@/types/subscription-dtos";

// ---------------------------------------------------------------------------
// DashboardService — single entry point for platform dashboard data
// ---------------------------------------------------------------------------
// Aggregates cross-tenant metrics so React pages receive a ready-to-render
// DTO instead of orchestrating multiple repositories themselves.
// Constructor-injected (default = anon singletons) — follows existing pattern.
// ---------------------------------------------------------------------------

export class DashboardService {
  constructor(
    private superAdmin: SuperAdminRepository = defaultSuperAdmin,
    private invoices: InvoiceRepository = defaultInvoice,
    private trials: TrialRequestRepository = defaultTrial,
    private scheduler: SchedulerRunRepository = defaultScheduler,
  ) {}

  /** Single call for the SLE Operations section on the platform dashboard. */
  async getPlatformOverview(): Promise<PlatformOverview> {
    const tenants = await this.superAdmin.getAllTenants();
    const tenantIds = tenants.map((t) => t.pharmacyId as unknown as string);

    // Single batch query — replaces N per-tenant queries.
    const allInvoices = tenantIds.length > 0
      ? await this.invoices.listByTenants(tenantIds).catch(() => [] as InvoiceRecord[])
      : [];

    // Aggregate from the flat invoice list (O(n) single pass).
    let totalMRR = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    const now = new Date();
    for (const inv of allInvoices) {
      if (inv.status === "paid" && inv.paidAt) {
        const pd = new Date(inv.paidAt);
        if (pd.getMonth() === now.getMonth() && pd.getFullYear() === now.getFullYear()) {
          totalMRR += inv.amount;
        }
      }
      if (inv.status === "overdue") {
        overdueCount++;
        overdueAmount += inv.amount;
      }
    }

    const byState: Record<string, number> = {};
    for (const t of tenants) {
      const s = t.isActive ? "active" : "inactive";
      byState[s] = (byState[s] ?? 0) + 1;
    }

    let pendingTrialCount = 0;
    try {
      const allTrials = await this.trials.listQueue();
      pendingTrialCount = allTrials.filter((t) => t.status === "pending" || t.status === "reviewing").length;
    } catch { /* best-effort */ }

    let failedSchedulerRunCount = 0;
    try {
      const runs = await this.scheduler.listRecent(undefined, 50);
      failedSchedulerRunCount = runs.filter((r) => r.status === "failed").length;
    } catch { /* best-effort */ }

    return {
      totalTenants: tenants.length,
      activeTenants: byState.active ?? 0,
      byState,
      mrrEstimate: totalMRR,
      outstandingInvoiceCount: overdueCount,
      outstandingAmount: overdueAmount,
      pendingTrialCount,
      failedSchedulerRunCount,
      overdueInvoiceCount: overdueCount,
    };
  }

  /** Single call for the Billing Monitor page. */
  async getBillingOverview(): Promise<BillingOverview> {
    const tenants = await this.superAdmin.getAllTenants();
    const tenantIds = tenants.map((t) => t.pharmacyId as unknown as string);

    // Build tenant name lookup
    const nameMap = new Map<string, string>();
    for (const t of tenants) {
      nameMap.set(t.pharmacyId as unknown as string, t.pharmacyName);
    }

    // Single batch query — replaces N per-tenant queries.
    const allInvoices = tenantIds.length > 0
      ? await this.invoices.listByTenants(tenantIds).catch(() => [] as InvoiceRecord[])
      : [];

    const invoiceRows: InvoiceSummaryRow[] = allInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      tenantId: inv.tenantId,
      tenantName: nameMap.get(inv.tenantId) ?? "—",
      amount: inv.amount,
      status: inv.status,
      dueDate: inv.dueDate ?? null,
      createdAt: inv.createdAt ?? null,
      paidAt: inv.paidAt ?? null,
    }));

    const totalOutstanding = invoiceRows
      .filter((i) => ["sent", "overdue", "draft"].includes(i.status))
      .reduce((s, i) => s + i.amount, 0);
    const overdueCount2 = invoiceRows.filter((i) => i.status === "overdue").length;
    const overdueAmount2 = invoiceRows
      .filter((i) => i.status === "overdue")
      .reduce((s, i) => s + i.amount, 0);
    const paidThisMonth = invoiceRows
      .filter((i) => {
        if (i.status !== "paid" || !i.paidAt) return false;
        const d = new Date(i.paidAt);
        const now2 = new Date();
        return d.getMonth() === now2.getMonth() && d.getFullYear() === now2.getFullYear();
      })
      .reduce((s, i) => s + i.amount, 0);
    const active = tenants.filter((t) => t.isActive).length;

    return {
      invoices: invoiceRows,
      totalOutstanding,
      overdueCount: overdueCount2,
      overdueAmount: overdueAmount2,
      paidThisMonth,
      estimatedMRR: paidThisMonth,
      totalTenants: tenants.length,
      activeTenants: active,
    };
  }
}

export const dashboardService = new DashboardService();
