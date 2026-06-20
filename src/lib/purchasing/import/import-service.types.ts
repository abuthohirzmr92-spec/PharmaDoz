/**
 * P0.9A.3 — Import Service Types (Shared)
 *
 * Used by CSV, Excel, OCR, and future Supplier API importers.
 */

// ─── Context ───

export interface ImportContext {
  /** Tenant ID for the draft */
  tenantId: string;
  /** Current branch ID */
  branchId: string | null;
  /** Current user ID */
  userId: string | null;
}

// ─── Identity Strategy ───

export interface ImportIdentityStrategy {
  /** Generate a draft ID */
  generateDraftId: () => string;
  /** Generate a unique ID for each draft item */
  generateItemId: () => string;
}

// ─── Combined deps for full import ───

export interface ImportDeps extends ImportContext, ImportIdentityStrategy {}
