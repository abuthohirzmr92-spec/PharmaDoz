// ---------------------------------------------------------------------------
// RC1 P0L.1 — Location Permission Validator
// ---------------------------------------------------------------------------
// PURE functions. Validates operator permissions for location operations.
//
// RC1: Stub — all permissions pass.
// RC2: Add role-based checks (only pharmacist/supervisor can relocate, etc.)
//
// Internal: imported by location-validator.ts → public API unchanged.
// ---------------------------------------------------------------------------

import type { ValidatorResult } from "../location-types";
import { validationPassed } from "../location-types";

export interface PermissionContext {
  userId: string;
  role?: string;
  tenantId: string;
}

export function validateRelocationPermission(
  _context: PermissionContext,
): ValidatorResult {
  // RC1: All users can relocate. No permission checks yet.
  // RC2: Add role checks — e.g. only "pharmacist", "supervisor", "admin"
  return validationPassed();
}

export function validateLocationManagementPermission(
  _context: PermissionContext,
): ValidatorResult {
  // RC1: All users can manage locations (CRUD).
  // RC2: Restrict to admin/supervisor roles.
  return validationPassed();
}
