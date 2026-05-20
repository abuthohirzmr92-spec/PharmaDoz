/* ------------------------------------------------------------------ */
/*  Report Filter & Configuration Types                               */
/* ------------------------------------------------------------------ */

export type DatePreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "last7"
  | "last30"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset: DatePreset;
}

export type ReportTab = "sales" | "inventory" | "expired" | "purchase" | "pl";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface ReportFilters {
  tenantId?: string;
  dateRange: DateRange;
  status?: string;
  paymentMethod?: string;
  category?: string;
  supplierId?: string;
  searchQuery: string;
  sort?: SortConfig;
  page: number;
  pageSize: number;
}

export type ExportFormat = "pdf" | "excel";
