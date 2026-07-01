// =================================================================
// Generic Transaction Correction Types
// EEOS V5 — Platform Architect Approved
// =================================================================

// ─── Module & Status Enums ───

export type TransactionModule =
  | "purchase_invoice"
  | "sales_invoice"
  | "stock_adjustment"
  | "medical_billing"
  | "clinical";

export type CorrectionType = "revision" | "void" | "adjustment";

export type CorrectionStatus =
  | "draft"
  | "pending_otp"
  | "verified"
  | "applied"
  | "rejected"
  | "expired"
  | "rolled_back";

export type FieldDataType = "number" | "date" | "text" | "select";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "skipped";

// ─── Correction Entities ───

export interface TransactionCorrection {
  id: string;
  correlationId: string;
  tenantId: string;
  branchId?: string | null;
  module: TransactionModule;
  resourceType: string;
  resourceId: string;
  correctionType: CorrectionType;
  correctionNumber: number;
  status: CorrectionStatus;
  reason: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: string;
  sessionId?: string | null;
  metadata?: Record<string, unknown> | null;
  contractVersion: number;
  appliedAt?: string | null;
  rolledBackAt?: string | null;
  rolledBackFromCorrectionId?: string | null;
  createdAt: string;
}

export interface CorrectionDetail {
  id: string;
  correlationId: string;
  correctionId: string;
  resourceItemId?: string | null;
  productId?: string | null;
  productName: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  dataType: FieldDataType;
  createdAt: string;
}

export interface ApprovalStep {
  id: string;
  correctionId: string;
  stepOrder: number;
  approverRole: string;
  approverId?: string | null;
  status: ApprovalStatus;
  approvedAt?: string | null;
  comment?: string | null;
}

export interface FinancialAdjustment {
  id: string;
  correlationId: string;
  tenantId: string;
  branchId?: string | null;
  module: TransactionModule;
  sourceType: string;
  sourceId: string;
  entityType: string;
  entityId?: string | null;
  amount: number;
  status: string;
  reason: string;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  correlationId: string;
  tenantId: string;
  eventType: string;
  channel: string;
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  recipientRole?: string | null;
  subject?: string | null;
  body?: string | null;
  status: string;
  sentAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

// ─── Correction Engine Interface ───

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface BatchConflictResult {
  hasConflict: boolean;
  strategy: "allow" | "block" | "correction";
  conflicts: Array<{
    batchId: string;
    batchNumber: string;
    allocatedQty: number;
    currentQty: number;
    targetQty: number;
    issue: string;
  }>;
}

export interface ApplyResult {
  success: boolean;
  correctionId: string;
  newState?: unknown;
  stockMovements?: string[];
  error?: string;
}

export interface RollbackResult {
  success: boolean;
  correctionId: string;
  restoredCorrectionNumber: number;
  error?: string;
}

export interface ICorrectionEngine<TResource, TDetail> {
  readonly module: TransactionModule;

  validatePermission(user: { role: string }): ValidationResult;
  validateResource(resource: TResource): ValidationResult;
  validateStock?(resource: TResource, details: TDetail[]): ValidationResult;
  validatePayment?(resource: TResource, details: TDetail[]): ValidationResult;
  validateBatchConflict?(resource: TResource, details: TDetail[]): BatchConflictResult;

  computeNewState(resource: TResource, details: TDetail[]): TResource;
  applyCorrection(resource: TResource, newState: TResource, correlationId: string): Promise<ApplyResult>;
  rollbackCorrection(resource: TResource, targetCorrection: TransactionCorrection): Promise<RollbackResult>;
}

// ─── Domain Event Types ───

export type CorrelationId = string;

export type CorrectionDomainEvent =
  | { type: "correction.draft.created"; correlationId: CorrelationId; module: TransactionModule; resourceId: string; requestedBy: string }
  | { type: "correction.otp.requested"; correlationId: CorrelationId; sessionId: string; destination: string }
  | { type: "correction.otp.verified"; correlationId: CorrelationId; sessionId: string }
  | { type: "correction.otp.failed"; correlationId: CorrelationId; sessionId: string; attemptNumber: number }
  | { type: "correction.approval.required"; correlationId: CorrelationId; step: number; requiredRole: string }
  | { type: "correction.approval.granted"; correlationId: CorrelationId; step: number; approvedBy: string }
  | { type: "correction.approval.rejected"; correlationId: CorrelationId; step: number; rejectedBy: string; reason: string }
  | { type: "correction.apply.requested"; correlationId: CorrelationId; details: CorrectionDetail[] }
  | { type: "correction.apply.completed"; correlationId: CorrelationId; correctionId: string }
  | { type: "correction.apply.failed"; correlationId: CorrelationId; error: string }
  | { type: "correction.rollback.requested"; correlationId: CorrelationId; targetCorrectionNumber: number }
  | { type: "correction.rollback.completed"; correlationId: CorrelationId; correctionId: string }
  | { type: "correction.notification.sent"; correlationId: CorrelationId; recipients: string[]; channel: string };

// ─── Timeline ───

export interface TimelineEvent {
  source: string;
  correlationId: string;
  createdAt: string;
  eventType: string;
  status?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}
