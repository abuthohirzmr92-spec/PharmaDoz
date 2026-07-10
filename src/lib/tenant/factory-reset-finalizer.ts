// =================================================================
// MEDISYNC — Factory Reset Finalizer
// 🔒 Architecture Constitution v1.0
//
// Post-reset lifecycle management. Update tenant state, timestamps.
// Extension point: BackupStep, NotificationStep, EventPublisher (future).
// =================================================================

import type { TenantLifecycleState } from "./factory-reset.types";

export class ResetFinalizer {
  private tenantId: string;
  private completedAt: string;
  private lifecycleState: TenantLifecycleState = "READY_FOR_ICOB";
  private resetVersion = 1;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.completedAt = new Date().toISOString();
  }

  /** Hook: update tenant lifecycle state (future DB integration) */
  setLifecycleState(state: TenantLifecycleState): this {
    this.lifecycleState = state;
    return this;
  }

  /** Hook: update reset version counter (future DB integration) */
  setResetVersion(version: number): this {
    this.resetVersion = version;
    return this;
  }

  // ─── Future Extension Points (no implementation yet) ───

  /** Future: create backup before finalizing */
  // async createBackup(): Promise<void> { }

  /** Future: archive deleted data snapshot */
  // async archiveSnapshot(): Promise<void> { }

  /** Future: publish domain event */
  // async publishEvent(): Promise<void> { }

  /** Future: send notification to tenant owner */
  // async notifyOwner(): Promise<void> { }

  // ─── Finalize ───

  finalize() {
    return {
      tenantId: this.tenantId,
      lifecycleState: this.lifecycleState,
      resetVersion: this.resetVersion,
      completedAt: this.completedAt,
    };
  }
}
