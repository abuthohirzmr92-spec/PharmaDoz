// =================================================================
// Invoice Revision Drawer V3.2.1 — Types
// 🔒 ARCHITECTURE LOCKED — do not modify without PO approval
// =================================================================

// ─── Working Copy ───

export type WorkingItemState = "UNCHANGED" | "MODIFIED" | "NEW" | "DELETED";

/**
 * OriginalPurchaseSnapshot
 *
 * Responsibility: Immutable snapshot of original invoice item fields
 * needed for old→new comparison. Never carries UI identity or state.
 *
 * Owner: build-working-diff (read-only comparison source)
 * Lifecycle: Created once per item at drawer open. Never mutated.
 *
 * Thread Safety: Immutable — never mutated after creation.
 * Memoization Safe: Stable reference, safe for useMemo deps.
 */
export interface OriginalPurchaseSnapshot {
  /** Identity of the original invoice item — for audit, diff, rollback, timeline */
  originalItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  sellingPrice: number;
  batchNumber: string;
  expiredDate: string;
  storageAreaId: string;
  storageSlot: string;
  unit?: string;
  supplierName?: string;
}

/**
 * WorkingPurchaseItem
 *
 * Responsibility: Single editable item in the revision working copy.
 * ALL business data from props. NO local business state in components.
 *
 * Owner: InvoiceRevisionDrawer (state root)
 * Lifecycle: Created from OriginalPurchaseSnapshot on drawer open.
 *            Mutated immutably during editing.
 *            Committed via adapter → store → engine on save.
 *            Discarded on cancel or reset.
 *
 * Usage: RevisionTable → RevisionRow (controlled component)
 */
export interface WorkingPurchaseItem {
  // ── Identity (UI-stable, NEVER array index) ──
  workingId: string;
  originalItemId: string | null; // null = NEW, non-null = from invoice

  // ── Business fields ──
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  sellingPrice: number;
  batchNumber: string;
  expiredDate: string;
  storageAreaId: string;
  storageSlot: string;
  unit?: string;
  supplierName?: string;
  barcode?: string;
  notes?: string;
  rawProductName?: string;
  matchConfidence?: number;
  matchMethod?: string;
  draftStatus?: string;
  warnings?: Array<{ code: string; message: string; level: string }>;
  originalRowIndex?: number;
  reviewStatus?: string;
  humanReviewed?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;

  // ── Working state ──
  _state: WorkingItemState;
  /** Immutable snapshot for old→new comparison. null for NEW items. */
  _original: OriginalPurchaseSnapshot | null;
}

// ─── Revision Session ───

export type RevisionSessionState =
  | "OPEN"
  | "EDITING"
  | "VALIDATING"
  | "READY"
  | "COMMITTING"
  | "COMPLETED"
  | "CANCELLED";

/**
 * RevisionSession
 *
 * Responsibility: Track the state machine of one revision attempt.
 * Future: autosave, undo, redo, approval will use this object.
 *
 * Owner: InvoiceRevisionDrawer
 * Lifecycle: Created at OPEN, transitions through states, ends at COMPLETED or CANCELLED.
 */
export interface RevisionSession {
  sessionId: string;
  state: RevisionSessionState;
  invoiceId: string;
  createdBy?: string;
  isDirty: boolean;
  startedAt: string;
  updatedAt: string;
}

// ─── Validation ───

export interface ValidationError {
  field: string;
  itemWorkingId?: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  itemWorkingId?: string;
  message: string;
  code: string;
}

/**
 * ValidationResult
 *
 * Responsibility: Complete result of UI-level validation.
 * errors[] block save. warnings[] inform only.
 * summary provides pre-computed stats — UI never recalculates.
 *
 * Owner: validate-revision.ts (pure function)
 * Lifecycle: Created on "Simpan Revisi". Read by Drawer to decide save or show errors.
 *            Never persisted. Never passed to Engine.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    errorCount: number;
    warningCount: number;
    hasBlockingError: boolean;
    hasWarning: boolean;
  };
}

// ─── Summary ───

/**
 * RevisionSummaryData
 *
 * Responsibility: Pre-computed summary statistics for the RevisionSummary component.
 * Component only renders — NEVER computes.
 *
 * Owner: build-revision-summary.ts (pure function)
 * Lifecycle: Computed whenever workingItems change.
 */
export interface RevisionSummaryData {
  itemsChanged: number;
  itemsAdded: number;
  itemsDeleted: number;
  qtyChanges: number;
  priceChanges: number;
  batchChanges: number;
  expiryChanges: number;
  locationChanges: number;
  totalOld: number;
  totalNew: number;
  deltaAmount: number;
}

// ─── Working Diff ───

export interface FieldChange {
  itemWorkingId: string;
  field: string;
  oldValue: string;
  newValue: string;
}

/**
 * WorkingDiff
 *
 * Responsibility: Generic diff between original and working copy.
 * Stage 1 of the Adapter Layer. Stage 2 transforms this into CorrectionDetail[].
 *
 * Owner: build-working-diff.ts (pure function, reusable across modules)
 * Lifecycle: Created once on save. Consumed by build-correction-details.
 */
export interface WorkingDiff {
  changed: FieldChange[];
  added: WorkingPurchaseItem[];
  removed: string[]; // originalItemId[]
}
