// =================================================================
// EEOS EDK — Engine Lifecycle
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Standard lifecycle state machine for all engines.
// Deterministic transitions. No illegal state changes.
// =================================================================

import type { EngineLifecycleState } from "./engine-types";
import { LifecycleError } from "./engine-errors";

const VALID_TRANSITIONS: Record<EngineLifecycleState, EngineLifecycleState[]> = {
  REGISTERED:   ["VALIDATED"],
  VALIDATED:    ["INITIALIZED", "DISPOSED"],
  INITIALIZED:  ["EXECUTING", "DISPOSED"],
  EXECUTING:    ["COMPLETED", "FAILED", "BLOCKED"],
  COMPLETED:    ["DISPOSED"],
  FAILED:       ["INITIALIZED", "DISPOSED"],
  BLOCKED:      ["INITIALIZED", "DISPOSED"],
  DISPOSED:     [],
};

export function canTransition(from: EngineLifecycleState, to: EngineLifecycleState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transition(
  engineId: string,
  from: EngineLifecycleState,
  to: EngineLifecycleState,
): EngineLifecycleState {
  if (!canTransition(from, to)) {
    throw new LifecycleError(
      engineId,
      `Illegal transition: ${from} → ${to}`,
    );
  }
  return to;
}

export function isTerminal(state: EngineLifecycleState): boolean {
  return state === "COMPLETED" || state === "FAILED" || state === "BLOCKED" || state === "DISPOSED";
}

export function isActive(state: EngineLifecycleState): boolean {
  return state === "INITIALIZED" || state === "EXECUTING";
}
