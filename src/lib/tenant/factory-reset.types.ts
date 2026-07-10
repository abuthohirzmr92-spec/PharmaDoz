// =================================================================
// MEDISYNC — Factory Reset Types (Enterprise v2)
// 🔒 Architecture Constitution v1.0
// =================================================================

// ─── Lifecycle State Machine ───

export type TenantLifecycleState = "ACTIVE" | "READY_FOR_ICOB" | "RESETTING" | "ARCHIVED" | "SUSPENDED";

// Lifecycle managed by TenantLifecycleMachine (tenant-lifecycle-machine.ts)

// ─── Step Engine ───

export interface ResetStep {
  readonly stepId: string;
  readonly stepName: string;
  readonly priority: number;
  readonly description: string;
  readonly estimatedRows: number;
  readonly dependsOn: readonly string[];
  execute(tenantId: string, userId: string, dryRun: boolean): Promise<StepResult>;
}

export interface StepResult {
  stepId: string;
  stepName: string;
  success: boolean;
  rowsAffected: number;
  dryRun: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  warnings: readonly string[];
  error?: string;
}

// ─── Rich Plan ───

export interface FactoryResetPlan {
  readonly planId: string;
  readonly tenantId: string;
  readonly version: number;
  readonly steps: readonly ResetStep[];
  readonly estimatedDurationMs: number;
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH";
  readonly transactionMode: "single" | "per_step";
  readonly rollbackMode: "manual" | "none";
  readonly createdAt: string;
}

// ─── Progress ───

export interface ResetProgress {
  currentStep: string | null;
  completedSteps: string[];
  remainingSteps: string[];
  percentage: number;
  startedAt: string | null;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
}

// ─── Domain Events ───

export interface DomainEvent {
  eventId: string;
  eventType: string;
  tenantId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

// ─── Hooks ───

export interface ResetHooks {
  beforeReset?: (tenantId: string) => Promise<void>;
  afterReset?: (tenantId: string, result: FactoryResetResult) => Promise<void>;
  onError?: (tenantId: string, error: Error) => Promise<void>;
}

// ─── Result ───

export interface ResetTableSummary {
  table: string;
  count: number;
}

export interface FactoryResetResult {
  readonly success: boolean;
  readonly tenantId: string;
  readonly completedAt: string;
  readonly durationMs: number;
  readonly deletedTables: readonly ResetTableSummary[];
  readonly deletedRows: number;
  readonly warnings: readonly string[];
  readonly resetVersion: number;
  readonly newLifecycleState: TenantLifecycleState;
  readonly dryRun: boolean;
  readonly steps: readonly StepResult[];
  readonly error?: string;
}

// ─── Validation ───

export interface ValidationCheck {
  passed: boolean;
  rule: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  checks: readonly ValidationCheck[];
}

// Errors are now in factory-reset-errors.ts (consolidated error model)

// ─── Legacy Types (for backward compat with ResetPlanner, ResetExecutor) ───

export interface ResetTableEntry { table: string; description: string; dependencyOrder: number; }
export interface ValidationRule { name: string; validate: () => Promise<ValidationCheck>; }
