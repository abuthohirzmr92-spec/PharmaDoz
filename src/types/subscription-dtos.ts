// ---------------------------------------------------------------------------
// Subscription DTOs — UI-consumable data transfer objects
// ---------------------------------------------------------------------------
// Separated from repository entities so the UI never depends on DB row shapes.
// All fields are serializable; no methods, no DB-specific types.
// ---------------------------------------------------------------------------

/** Aggregated platform overview consumed by the Super Admin dashboard. */
export interface PlatformOverview {
  totalTenants: number;
  activeTenants: number;
  byState: Record<string, number>;
  mrrEstimate: number;
  outstandingInvoiceCount: number;
  outstandingAmount: number;
  pendingTrialCount: number;
  failedSchedulerRunCount: number;
  overdueInvoiceCount: number;
}

/** Lightweight tenant-subscription row for the subscription list table. */
export interface TenantSubscriptionRow {
  tenantId: string;
  tenantName: string;
  packageName: string | null;
  isActive: boolean;
  lifecycleState: string | null;
  subscriptionId: string | null;
}

/** Invoice summary row for the billing monitor. */
export interface InvoiceSummaryRow {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  status: string;
  dueDate: string | null;
  createdAt: string | null;
  paidAt: string | null;
}

/** Aggregated billing overview for the billing monitor page. */
export interface BillingOverview {
  invoices: InvoiceSummaryRow[];
  totalOutstanding: number;
  overdueCount: number;
  overdueAmount: number;
  paidThisMonth: number;
  estimatedMRR: number;
  totalTenants: number;
  activeTenants: number;
}

/** Aggregated trial desk row. Mirrors TrialRequestRecord but UI-only. */
export interface TrialDeskRow {
  id: string;
  pharmacyName: string;
  applicantName: string;
  email: string;
  status: string;
  requestedPlanId: string | null;
  createdAt: string | null;
  approvedDurationDays: number | null;
}

/** Aggregated promotion card for the promotion management page. */
export interface PromotionCard {
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

/** Aggregated provider card for the provider management page. */
export interface ProviderCard {
  key: string;
  methods: string[];
  methodsCount: number;
  hasRefund: boolean;
  hasCancel: boolean;
  hasWebhook: boolean;
  mode: string;
  integrationStatus: string | null;
  integrationLabel: string | null;
}

/** Flat scheduler run row — mirrors the DB row for the scheduler page table. */
export interface SchedulerRunRow {
  id: string;
  jobKey: string;
  runDate: string;
  status: string;
  processedCount: number;
  startedAt?: string | null;
  finishedAt?: string | null;
}

/** Aggregated scheduler job-run row for the scheduler page (grouped by job_key). */
export interface SchedulerJobRow {
  jobKey: string;
  runs: SchedulerRunRow[];
}

/** Aggregated audit log entry for the audit page. */
export interface AuditLogRow {
  id: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  tenantId: string | null;
  createdAt: string | null;
  correlationId?: string | null;
}
