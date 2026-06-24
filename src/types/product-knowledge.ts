// ---------------------------------------------------------------------------
// RC1.5 P0 — MEDISYNC Product Knowledge Base (MPKB) Foundation
// ---------------------------------------------------------------------------
// Architecture:
//   Tenant Product → Candidate Pool → Super Admin Review → Global Library
//
// Tenant tetap bebas. Global Library tetap dikontrol.
// ---------------------------------------------------------------------------

import type { UnitLevel } from "./unit";

// ============================================================================
// Candidate Product — awaiting super admin review
// ============================================================================

export type CandidateSourceType = "manual" | "excel_import" | "ocr_import";

export type CandidateStatus = "pending" | "approved" | "rejected" | "archived";

export interface CandidateProduct {
  id: string;
  /** Tenant yang mengajukan produk ini */
  sourceTenantId: string;
  /** Product ID asli dari tenant */
  sourceProductId: string;
  /** Sumber data: manual, excel import, OCR */
  sourceType: CandidateSourceType;

  /** Core product fields */
  name: string;
  barcode: string | null;
  /** RC1.5 P1C — Product identity fields */
  manufacturer: string | null;
  strength: string | null;
  dosageForm: string | null;
  category: string;
  baseUnit: string;
  unitLevels: UnitLevel[];

  /** Review status */
  status: CandidateStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;

  /** Deduplication tracking */
  occurrenceCount: number;
  tenantUsageCount: number;

  /** Timestamps */
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Global Product Library — curated master product catalog
// ============================================================================

export interface GlobalProduct {
  id: string;
  name: string;
  barcode: string | null;
  manufacturer: string | null;
  strength: string | null;
  dosageForm: string | null;
  category: string;
  baseUnit: string;
  unitLevels: UnitLevel[];

  /** Quality score (0-100) */
  qualityScore: number;
  /** Number of tenants using this product */
  tenantUsageCount: number;
  /** Source: super admin who created/approved */
  createdBy: string | null;
  /** ID of original candidate (nullable — super admin can create directly) */
  sourceCandidateId: string | null;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Quality Score Calculator (pure function)
// ============================================================================

/**
 * Hitung quality score berdasarkan kelengkapan data dan popularitas.
 * Pure function — zero side effects.
 */
export function computeQualityScore(product: {
  barcode?: string | null;
  manufacturer?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  unitLevels?: UnitLevel[];
  tenantUsageCount?: number;
  manuallyApproved?: boolean;
}): number {
  let score = 0;
  if (product.barcode) score += 10;
  if (product.manufacturer) score += 10;
  if (product.strength) score += 5;
  if (product.dosageForm) score += 5;
  if (product.unitLevels && product.unitLevels.length > 0) score += 15;
  const tc = product.tenantUsageCount ?? 0;
  if (tc >= 3) score += 30;
  else if (tc >= 1) score += 10;
  if (product.manuallyApproved) score += 20;
  return Math.min(100, score);
}
