// ---------------------------------------------------------------------------
// Billing Monitor ViewModel (PURE — NO business logic, NO I/O)
// ---------------------------------------------------------------------------
// Consumes already-fetched invoice DTOs and returns presentation-ready
// aging buckets, summary cards, and filter helpers.
// ---------------------------------------------------------------------------

import type { InvoiceSummaryRow } from "@/types/subscription-dtos";

export interface AgingBucket {
  label: string;
  count: number;
  amount: number;
}

export interface BillingSummaryCard {
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
}

/** Pure: days overdue for a given ISO date string. */
export function daysAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return null;
  return Math.floor((Date.now() - d) / 86_400_000);
}

/** Pure: aging label based on days overdue. */
export function agingLabel(days: number): { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" } {
  if (days <= 0) return { label: "Jatuh tempo hari ini", tone: "warning" };
  if (days <= 7) return { label: "1–7 hari", tone: "warning" };
  if (days <= 14) return { label: "8–14 hari", tone: "warning" };
  if (days <= 30) return { label: "15–30 hari", tone: "danger" };
  return { label: ">30 hari", tone: "danger" };
}

/** Pure: invoice status → badge tone. */
export function invoiceStatusTone(s: string): "success" | "warning" | "danger" | "neutral" {
  if (s === "paid") return "success";
  if (s === "overdue") return "danger";
  if (s === "sent" || s === "draft") return "warning";
  return "neutral";
}

/** Pure: compute aging buckets from a flat invoice list. */
export function computeAgingBuckets(invoices: InvoiceSummaryRow[]): AgingBucket[] {
  const buckets = [
    { label: "Jatuh tempo hari ini", filter: (d: number) => d <= 0 },
    { label: "1–7 hari", filter: (d: number) => d > 0 && d <= 7 },
    { label: "8–14 hari", filter: (d: number) => d > 7 && d <= 14 },
    { label: "15–30 hari", filter: (d: number) => d > 14 && d <= 30 },
    { label: ">30 hari", filter: (d: number) => d > 30 },
  ];

  return buckets.map((bucket) => {
    const matched = invoices.filter((i) => {
      if (i.status === "paid" || i.status === "canceled") return false;
      const d = daysAgo(i.dueDate);
      return d !== null && bucket.filter(d);
    });
    return {
      label: bucket.label,
      count: matched.length,
      amount: matched.reduce((s, i) => s + i.amount, 0),
    };
  });
}
