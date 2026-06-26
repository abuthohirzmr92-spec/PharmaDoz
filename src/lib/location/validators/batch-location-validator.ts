// ---------------------------------------------------------------------------
// RC1 P0L.1 — Batch Location Validator
// ---------------------------------------------------------------------------
// PURE functions. Validates batch eligibility for location operations.
//
// ADR-008: Batch location is reality.
// INV-013: Batch location only changes through Location Management Engine.
//
// Internal: imported by location-validator.ts → public API unchanged.
// ---------------------------------------------------------------------------

import type { LocationMaster, ValidatorResult } from "../location-types";
import { validationPassed, validationFailed } from "../location-types";
import type { ValidationContext } from "./location-validator";

export function validateRelocation(
  currentLocationId: string | null,
  targetLocation: LocationMaster | null,
  context: ValidationContext,
): ValidatorResult {
  if (!targetLocation) {
    return validationFailed(["Lokasi tujuan tidak ditemukan."]);
  }
  if (targetLocation.tenantId !== context.tenantId) {
    return validationFailed([`Lokasi tujuan "${targetLocation.name}" bukan milik tenant ini.`]);
  }
  if (context.mustBeActive !== false && !targetLocation.isActive) {
    return validationFailed([`Lokasi tujuan "${targetLocation.name}" sudah tidak aktif.`]);
  }
  if (currentLocationId && targetLocation.id === currentLocationId) {
    return validationFailed(["Batch sudah berada di lokasi ini. Tidak ada perubahan."]);
  }
  return validationPassed();
}

export function validateBatchForLocation(
  batch?: {
    id: string;
    quantity?: number;
    isActive?: boolean;
    expiredDate?: string;
  } | null,
): ValidatorResult {
  if (!batch) {
    return validationFailed(["Batch tidak ditemukan."]);
  }
  if (batch.quantity !== undefined && batch.quantity <= 0) {
    return validationFailed([`Batch ${batch.id} sudah habis (qty: ${batch.quantity}). Lokasi tidak relevan.`]);
  }
  return validationPassed();
}
