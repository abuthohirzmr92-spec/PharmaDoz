// =================================================================
// MEDISYNC — Factory Reset Session
// 🔒 Architecture Constitution v1.0
//
// Prevents concurrent resets per tenant. Tracks lifecycle + progress.
// History-ready. Heartbeat-ready. No DB dependency.
// =================================================================

import type { ResetProgress, TenantLifecycleState } from "./factory-reset.types";
import { ConcurrencyError } from "./factory-reset-errors";

// ─── Session Types ───

export type SessionStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "EXPIRED";

export interface SessionRecord {
  sessionId: string;
  tenantId: string;
  initiatedBy: string;
  status: SessionStatus;
  progress: ResetProgress;
  startedAt: string;
  completedAt: string | null;
  lastHeartbeat: string;
  error: string | null;
  finalLifecycle: TenantLifecycleState | null;
}

// ─── Guard ───

const activeSessions = new Map<string, FactoryResetSession>();

export function getActiveSession(tenantId: string): FactoryResetSession | undefined {
  return activeSessions.get(tenantId);
}

// ─── Session ───

export class FactoryResetSession {
  private record: SessionRecord;

  constructor(tenantId: string, initiatedBy: string) {
    // Guard: reject if already running
    if (activeSessions.has(tenantId)) {
      const existing = activeSessions.get(tenantId)!;
      if (existing.getStatus() === "RUNNING" || existing.getStatus() === "PENDING") {
        throw new ConcurrencyError(tenantId);
      }
    }

    this.record = {
      sessionId: `reset-${tenantId}-${Date.now()}`,
      tenantId,
      initiatedBy,
      status: "PENDING",
      progress: { currentStep: null, completedSteps: [], remainingSteps: [], percentage: 0, startedAt: null, status: "PENDING" },
      startedAt: new Date().toISOString(),
      completedAt: null,
      lastHeartbeat: new Date().toISOString(),
      error: null,
      finalLifecycle: null,
    };

    activeSessions.set(tenantId, this);
  }

  // ─── Lifecycle ───

  markRunning(): void {
    if (this.record.status !== "PENDING") throw new Error(`Cannot start: status is ${this.record.status}`);
    this.record.status = "RUNNING";
    this.record.progress.status = "RUNNING";
    this.record.progress.startedAt = new Date().toISOString();
    this.heartbeat();
  }

  markCompleted(finalLifecycle: TenantLifecycleState): void {
    if (this.record.status !== "RUNNING") throw new Error(`Cannot complete: status is ${this.record.status}`);
    this.record.status = "COMPLETED";
    this.record.completedAt = new Date().toISOString();
    this.record.progress.status = "COMPLETED";
    this.record.progress.percentage = 100;
    this.record.finalLifecycle = finalLifecycle;
    this.heartbeat();
  }

  markFailed(error: string): void {
    if (this.record.status !== "RUNNING") throw new Error(`Cannot fail: status is ${this.record.status}`);
    this.record.status = "FAILED";
    this.record.completedAt = new Date().toISOString();
    this.record.error = error;
    this.record.progress.status = "FAILED";
    this.heartbeat();
  }

  markExpired(): void {
    if (this.record.status === "COMPLETED" || this.record.status === "FAILED") return;
    this.record.status = "EXPIRED";
    this.record.completedAt = new Date().toISOString();
    this.record.error = "Session expired (heartbeat timeout)";
    this.record.progress.status = "FAILED";
  }

  // ─── Progress ───

  updateProgress(partial: Partial<ResetProgress>): void {
    this.record.progress = { ...this.record.progress, ...partial };
    this.heartbeat();
  }

  // ─── Heartbeat ───

  heartbeat(): void {
    this.record.lastHeartbeat = new Date().toISOString();
  }

  isExpired(timeoutMs = 300_000): boolean {
    if (this.record.status !== "RUNNING") return false;
    return Date.now() - new Date(this.record.lastHeartbeat).getTime() > timeoutMs;
  }

  // ─── Read ───

  getStatus(): SessionStatus { return this.record.status; }
  getProgress(): ResetProgress { return { ...this.record.progress }; }
  getRecord(): Readonly<SessionRecord> { return { ...this.record }; }
  getSessionId(): string { return this.record.sessionId; }

  // ─── Cleanup ───

  dispose(): void {
    activeSessions.delete(this.record.tenantId);
  }
}
