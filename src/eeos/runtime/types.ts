// =================================================================
// EEOS Runtime — Core Types
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Runtime type definitions. Framework-independent.
// Follows certified Output Contract (EEOS doc 25).
// =================================================================

// ─── Task ───

export type TaskClass =
  | "BUG"
  | "HOTFIX"
  | "FEATURE"
  | "ARCHITECTURE"
  | "REFACTOR"
  | "PERFORMANCE"
  | "SECURITY"
  | "UI"
  | "DOCUMENTATION"
  | "RESEARCH";

export interface TaskIntake {
  request: string;
  taskClass?: TaskClass;
  product?: string;
  epic?: string;
}

// ─── Execution ───

export type EngineStatus = "PENDING" | "RUNNING" | "PASS" | "WARNING" | "FAIL";

export type PipelinePhase =
  | "INTAKE"
  | "CLASSIFICATION"
  | "CONTEXT_RESOLUTION"
  | "MEMORY_RESOLUTION"
  | "POLICY_RESOLUTION"
  | "DISCOVERY"
  | "DEPENDENCY_RESOLUTION"
  | "ARCHITECTURE_COMPLIANCE"
  | "RISK_RESOLUTION"
  | "PLANNING"
  | "IMPLEMENTATION"
  | "VERIFICATION"
  | "REGRESSION"
  | "HARDENING"
  | "DOCUMENTATION"
  | "RELEASE";

// ─── Context ───

export interface ExecutionContext {
  executionId: string;
  taskClass: TaskClass;
  product: string;
  epic: string;
  sprint: string;
  story: string | null;
  branch: string;
  milestone: string;
  environment: string;
  architecturePackage: string;
  adrsActive: string[];
  featureScope: string;
  createdAt: string;
  frozen: boolean;
}

// ─── Engine ───

export interface EngineContract {
  name: string;
  phase: PipelinePhase;
  blocking: boolean;
  mandatory: boolean;
}

export interface EngineResult {
  engine: string;
  executionId: string;
  status: EngineStatus;
  summary: string;
  evidence: string[];
  decision: "PROCEED" | "BLOCK" | "RETRY";
  confidence: number;
  artifactsUsed: string[];
  risks: RiskItem[];
  dependencies: string[];
  nextAction: string;
  blockingIssues: string[];
}

export interface RiskItem {
  id: string;
  severity: "P0" | "P1" | "P2" | "P3";
  description: string;
  mitigation: string;
}

// ─── Trace ───

export interface TraceEntry {
  timestamp: string;
  phase: PipelinePhase;
  engine: string;
  status: EngineStatus;
  decision: "PROCEED" | "BLOCK" | "RETRY";
  summary: string;
}

// ─── Session ───

export interface ExecutionSession {
  executionId: string;
  context: ExecutionContext;
  currentPhase: PipelinePhase;
  completedPhases: PipelinePhase[];
  engineResults: Map<string, EngineResult>;
  trace: TraceEntry[];
  status: "RUNNING" | "BLOCKED" | "COMPLETED";
  startedAt: string;
  completedAt: string | null;
}

// ─── Result ───

export interface ExecutionResult {
  executionId: string;
  status: "COMPLETED" | "BLOCKED";
  trace: TraceEntry[];
  finalRecommendation: string;
  confidence: number;
  startedAt: string;
  completedAt: string;
}
