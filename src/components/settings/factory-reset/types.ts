// =================================================================
// MEDISYNC — Factory Reset Wizard Types
// 🔒 Architecture Constitution v1.0
// =================================================================

export type FactoryResetStage =
  | "WARNING"
  | "PREVIEW"
  | "VALIDATION"
  | "CONFIRM"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "SESSION_EXPIRED";

export const NEXT_STAGE: Partial<Record<FactoryResetStage, FactoryResetStage>> = {
  WARNING:    "PREVIEW",
  PREVIEW:    "VALIDATION",
  VALIDATION: "CONFIRM",
  CONFIRM:    "EXECUTING",
  EXECUTING:  "COMPLETED",
  COMPLETED:  "COMPLETED",
};

export interface WizardState {
  stage: FactoryResetStage;
  preview: { table: string; count: number }[] | null;
  validation: { valid: boolean; checks: { passed: boolean; rule: string; message: string }[] } | null;
  confirmationText: string;
  progress: { currentStep: string | null; completedSteps: string[]; percentage: number; status: string } | null;
  result: { success: boolean; deletedRows: number; durationMs: number; newLifecycleState: string; error?: string } | null;
  error: string | null;
  isLoading: boolean;
}
