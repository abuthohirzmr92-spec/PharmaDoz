// ---------------------------------------------------------------------------
// RC1 P0L.1 — Location Validator (Core)
// ---------------------------------------------------------------------------
// PURE functions. Validates location existence, tenant ownership, active status.
//
// INV-011: Every location validation passes through this module.
// Internal: imported by location-validator.ts → public API unchanged.
// ---------------------------------------------------------------------------

import type { LocationMaster, ValidatorResult } from "../location-types";
import { validationPassed, validationFailed } from "../location-types";

export interface ValidationContext {
  tenantId: string;
  mustBeActive?: boolean;
  allowLegacy?: boolean;
}

export function validateLocation(
  location: LocationMaster | null | undefined,
  context: ValidationContext,
): ValidatorResult {
  if (!location) {
    return validationFailed(["Lokasi tidak ditemukan."]);
  }
  if (location.tenantId !== context.tenantId) {
    return validationFailed([`Lokasi "${location.name}" bukan milik tenant ini.`]);
  }
  if (context.mustBeActive !== false && !location.isActive) {
    return validationFailed([`Lokasi "${location.name}" sudah tidak aktif.`]);
  }
  return validationPassed();
}

export function validateLocationId(
  locationId: string | null | undefined,
  context: ValidationContext,
): ValidatorResult {
  if (!locationId || locationId.trim().length === 0) {
    if (context.allowLegacy) return validationPassed();
    return validationFailed(["ID Lokasi tidak boleh kosong."]);
  }
  const trimmed = locationId.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) return validationPassed();
  if (context.allowLegacy && trimmed.length >= 1 && trimmed.length <= 100) return validationPassed();
  if (!context.allowLegacy) return validationFailed([`ID Lokasi "${trimmed}" bukan format yang valid.`]);
  return validationPassed();
}
