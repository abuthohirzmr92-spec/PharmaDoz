// =================================================================
// P0.8E — Purchase Draft Types
// =================================================================

// ─── Draft Source ───

export type DraftSource = "manual" | "csv" | "excel" | "ocr";

// ─── Draft Status ───

export type DraftStatus =
  | "draft"
  | "ready"
  | "has_warning"
  | "has_error"
  | "confirming"          // double-submit prevention lock
  | "confirmed"
  | "completed"
  | "cancelled";

// ─── Draft Item Status ───

export type DraftItemStatus =
  | "pending"
  | "matched"
  | "fuzzy_match"
  | "unmatched"
  | "warning"
  | "error"
  | "merged"
  | "deleted";

// ─── Match Method ───

export type MatchMethod = "barcode" | "code" | "exact" | "token_match" | "fuzzy" | "manual" | "unmatched";

// ─── Warning ───

export type WarningLevel = "info" | "warning" | "critical";

export interface DraftWarning {
  id: string;                       // "warning-{itemId}-{code}"
  level: WarningLevel;
  itemId: string;
  code: string;
  message: string;
  detail?: string;
}

// ─── Purchase Draft Item ───

export interface PurchaseDraftItem {
  id: string;

  // Product matching
  rawProductName: string;
  rawBarcode: string | null;
  matchedProductId: string | null;
  matchConfidence: number;         // 0–100
  matchMethod: MatchMethod;

  // Pricing
  enteredBuyPrice: number;
  previousBuyPrice: number | null;  // from purchase history
  currentSellingPrice: number;      // from product master
  discountPercent: number;          // 0–100

  // Quantity
  quantity: number;
  unit: string;

  // Batch
  batchNumber: string | null;
  expiredDate: string | null;       // ISO date

  // Supplier (per-item override)
  supplierName: string | null;

  // Notes
  notes: string | null;

  // Status
  status: DraftItemStatus;
  warnings: DraftWarning[];

  // Merged tracking
  mergedFromIds: string[];          // IDs of items merged into this one
}

// ─── Purchase Draft ───

export interface PurchaseDraft {
  id: string;
  tenantId: string;
  branchId: string | null;

  // Source
  sourceType: DraftSource;
  sourceReference: string | null;    // file name or OCR session ID

  // Supplier
  supplierId: string | null;
  supplierName: string | null;

  // Invoice
  invoiceNumber: string | null;
  purchaseDate: string;
  dueDate: string | null;

  // Items
  items: PurchaseDraftItem[];

  // Financial (computed)
  subtotal: number;
  discountTotal: number;
  grandTotal: number;

  // Status
  status: DraftStatus;

  // Audit
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
