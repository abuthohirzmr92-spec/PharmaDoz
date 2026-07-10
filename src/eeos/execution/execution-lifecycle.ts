// =================================================================
// EEOS Execution Engine — Lifecycle
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Deterministic lifecycle state machine for engine instances.
// Only these transitions are legal. Everything else throws.
// =================================================================

import type { EngineInstanceState, InstanceId } from "./execution-types";

const TRANSITIONS: Record<EngineInstanceState, EngineInstanceState[]> = {
  CREATED:      ["INITIALIZED", "DISPOSED"],
  INITIALIZED:  ["EXECUTING", "DISPOSED"],
  EXECUTING:    ["COMPLETED", "FAILED", "DISPOSED"],
  COMPLETED:    ["DISPOSED"],
  FAILED:       ["DISPOSED"],
  DISPOSED:     [],
};

export function canTransition(from: EngineInstanceState, to: EngineInstanceState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function transition(
  instanceId: InstanceId,
  from: EngineInstanceState,
  to: EngineInstanceState,
): EngineInstanceState {
  if (!canTransition(from, to)) {
    throw new Error(
      `[${instanceId}] Illegal lifecycle transition: ${from} → ${to}`,
    );
  }
  return to;
}

export function isTerminal(state: EngineInstanceState): boolean {
  return state === "COMPLETED" || state === "FAILED" || state === "DISPOSED";
}

export function isActive(state: EngineInstanceState): boolean {
  return state === "INITIALIZED" || state === "EXECUTING";
}
