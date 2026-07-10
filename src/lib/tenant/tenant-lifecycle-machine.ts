// =================================================================
// MEDISYNC — Tenant Lifecycle Machine
// 🔒 Architecture Constitution v1.0
//
// Enforces valid lifecycle transitions. Rejects illegal ones.
// Kept simple — supports current tenant states only.
// =================================================================

import type { TenantLifecycleState } from "./factory-reset.types";

const TRANSITIONS: Record<TenantLifecycleState, TenantLifecycleState[]> = {
  ACTIVE:         ["RESETTING", "ARCHIVED", "SUSPENDED"],
  RESETTING:      ["READY_FOR_ICOB", "ACTIVE"],
  READY_FOR_ICOB: ["ACTIVE", "ARCHIVED"],
  ARCHIVED:       [],
  SUSPENDED:      ["ACTIVE"],
};

export class TenantLifecycleMachine {
  constructor(private tenantId: string, private currentState: TenantLifecycleState) {}

  canTransition(to: TenantLifecycleState): boolean {
    return TRANSITIONS[this.currentState]?.includes(to) ?? false;
  }

  transition(to: TenantLifecycleState): TenantLifecycleState {
    if (!this.canTransition(to)) {
      throw new Error(`[${this.tenantId}] Illegal lifecycle: ${this.currentState} → ${to}`);
    }
    this.currentState = to;
    return this.currentState;
  }

  getState(): TenantLifecycleState {
    return this.currentState;
  }
}
