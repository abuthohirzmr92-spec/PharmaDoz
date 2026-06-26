// ---------------------------------------------------------------------------
// RC1 P0L.1 — Location Validator (Public API)
// ---------------------------------------------------------------------------
// PURE functions. Centralized validation gatekeeper.
//
// INV-011: Every location validation must pass through this validator.
//
// Public API is STABLE — consumers call these functions.
// Internal implementations live in validators/ — may be refactored
// without changing this file or affecting consumers.
// ---------------------------------------------------------------------------

import type { ValidatorResult } from "./location-types";

// Re-export from internal modules — public API unchanged.
export {
  validateLocation,
  validateLocationId,
  type ValidationContext,
} from "./validators/location-validator";

export {
  validateRelocation,
  validateBatchForLocation,
} from "./validators/batch-location-validator";

export {
  validateRelocationPermission,
  validateLocationManagementPermission,
  type PermissionContext,
} from "./validators/location-permission-validator";

// ============================================================================
// Composite Validation (still here — orchestrates internals)
// ============================================================================

export function validateAll(...results: ValidatorResult[]): ValidatorResult {
  const allErrors: string[] = [];
  for (const r of results) {
    if (!r.valid) allErrors.push(...r.errors);
  }
  if (allErrors.length > 0) {
    return { valid: false, errors: allErrors };
  }
  return { valid: true, errors: [] };
}
