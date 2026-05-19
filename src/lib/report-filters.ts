/* ------------------------------------------------------------------ */
/*  Report Filter Pipeline — chainable, pure                          */
/* ------------------------------------------------------------------ */

import type { Transaction } from "@/types/transaction";
import type { DateRange, ReportFilters, SortConfig } from "@/types/report";
import { isInRange } from "./date-utils";

/** Apply full filter pipeline to transactions */
export function applyFilters(
  transactions: Transaction[],
  filters: ReportFilters,
): { result: Transaction[]; totalCount: number } {
  let result = [...transactions];

  // Date range
  result = result.filter((t) => isInRange(t.createdAt, filters.dateRange));

  // Payment method
  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    result = result.filter((t) =>
      t.payments.some((p) => p.method === filters.paymentMethod),
    );
  }

  // Search
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter(
      (t) =>
        t.invoiceNumber.toLowerCase().includes(q) ||
        t.cashierName.toLowerCase().includes(q) ||
        t.items.some((i) => i.productName.toLowerCase().includes(q)),
    );
  }

  const totalCount = result.length;

  // Sort
  if (filters.sort) {
    result = applySort(result, filters.sort);
  }

  // Paginate
  const page = filters.page;
  const pageSize = filters.pageSize;
  const start = (page - 1) * pageSize;
  result = result.slice(start, start + pageSize);

  return { result, totalCount };
}

function applySort(transactions: Transaction[], sort: SortConfig): Transaction[] {
  return [...transactions].sort((a, b) => {
    let valA: unknown;
    let valB: unknown;

    switch (sort.key) {
      case "createdAt":
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
        break;
      case "total":
        valA = a.total;
        valB = b.total;
        break;
      case "invoiceNumber":
        valA = a.invoiceNumber;
        valB = b.invoiceNumber;
        break;
      case "cashierName":
        valA = a.cashierName;
        valB = b.cashierName;
        break;
      default:
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
    }

    if (typeof valA === "number" && typeof valB === "number") {
      return sort.direction === "asc" ? valA - valB : valB - valA;
    }
    const strA = String(valA);
    const strB = String(valB);
    return sort.direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });
}

/** Create default filters */
export function defaultFilters(dateRange: DateRange): ReportFilters {
  return {
    dateRange,
    searchQuery: "",
    page: 1,
    pageSize: 25,
  };
}
