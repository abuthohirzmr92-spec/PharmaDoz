/** Core types for the auto-diagnostic system.
 *
 * All snapshot types capture metadata only — never token values, cookie
 * values, email addresses, or any other sensitive business data. */

// ---- Probe steps ----

export interface ProbeStep {
  name: string;
  durationMs: number;
  status: "ok" | "timeout" | "error";
  detail?: string;
}

// ---- Diagnostic findings ----

export type FindingSeverity = "info" | "warn" | "error" | "critical";

export interface DiagnosticFinding {
  patternId: string;
  severity: FindingSeverity;
  message: string;
  timestamp: string; // ISO
  context?: DiagnosticSnapshot;
  remediation: string;
  count?: number; // set by DiagnosticRepository.report()
}

// ---- Snapshots (metadata only, no sensitive values) ----

export interface StorageSnapshot {
  cookieNames: string[];
  cookieCount: number;
  localStorageKeys: string[];
  localStorageCount: number;
}

export interface AuthSnapshot {
  hasUser: boolean;
  role: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  supabaseConnected: boolean;
}

export interface TimingSnapshot {
  steps: ProbeStep[];
  totalDurationMs: number;
}

export interface DiagnosticSnapshot {
  storage: StorageSnapshot;
  auth: AuthSnapshot;
  timing: TimingSnapshot;
}
