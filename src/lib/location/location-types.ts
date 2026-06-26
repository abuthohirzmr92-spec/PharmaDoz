// ---------------------------------------------------------------------------
// RC1 P0L.1 — Location Management Engine: Domain Contracts
// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for all location types.
// Used by: Engine modules, Repositories, Stores, UI.
// PURE: zero React, Store, Supabase, or side effects.
//
// ADR-007: Location Management Engine is the Single Source of Truth.
// ADR-008: Product Default Location = suggestion. Batch Location = reality.
// ADR-010: Product Default is inheritance for NEW batches only.
//          Changes to product default do NOT affect existing batches.
// ---------------------------------------------------------------------------

// ============================================================================
// MASTER DATA
// ============================================================================

/** A physical storage location within a pharmacy (e.g. "Rak A-03-02"). */
export interface LocationMaster {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// RESOLUTION SOURCE (ADR-004)
// ============================================================================

/**
 * Where the effective location was resolved from.
 *
 * Priority (highest → lowest):
 *   "batch"    — batch.location_id (reality — ADR-008)
 *   "purchase" — purchase.location_id (initial value only — ADR-006)
 *   "product"  — product.default_location_id (suggestion — ADR-008)
 *   "legacy"   — product.rack_location (fallback — ADR-001)
 *   "none"     — no location available
 */
export type LocationResolutionSource =
  | "batch"
  | "purchase"
  | "product"
  | "legacy"
  | "none";

// ============================================================================
// RESOLUTION INPUT / OUTPUT
// ============================================================================

/** Input to the resolution chain. All fields optional — engine handles nulls. */
export interface LocationResolutionInput {
  /** The batch being queried */
  batch?: {
    storageAreaId?: string | null;  // FK → storage_areas
    storageSlot?: string | null;    // free-text slot
    isRelocated?: boolean;
  } | null;
  /** The purchase that created this batch (initial value only — ADR-006) */
  purchase?: {
    storageAreaId?: string | null;
    storageSlot?: string | null;
  } | null;
  /** The product master record */
  product?: {
    defaultStorageAreaId?: string | null;  // FK → storage_areas
    defaultStorageSlot?: string | null;    // free-text slot
    rackLocation?: string | null;          // LEGACY — ADR-001
  } | null;
}

/** Output from the resolution chain — raw result before policy application. */
export interface LocationResolutionOutput {
  /** Resolved storage area ID (null if no location available) */
  storageAreaId: string | null;
  /** Resolved storage slot (null if no slot specified) */
  storageSlot: string | null;
  /** Which source provided the winning location */
  source: LocationResolutionSource;
  /** True when `source === "batch"` — batch was explicitly relocated */
  isRelocated: boolean;
  /** True when `source === "legacy"` — using free-text fallback */
  isLegacy: boolean;
}

// ============================================================================
// EFFECTIVE LOCATION (final resolved DTO for consumers)
// ============================================================================

/** The final resolved location, ready for display or filtering. */
export interface EffectiveLocation {
  /** Storage area ID (null if unresolved) */
  storageAreaId: string | null;
  /** Storage area code, e.g. "R01" (null if unresolved) */
  storageAreaCode: string | null;
  /** Storage area name, e.g. "Rak A" (null if unresolved) */
  storageAreaName: string | null;
  /** Storage slot, e.g. "A-12" (null if no slot) */
  storageSlot: string | null;
  /** Which source resolved this location */
  source: LocationResolutionSource;
  /** True when the batch was explicitly moved from the product default */
  isRelocated: boolean;
  /** Human-readable label for UI display (ADR-003) */
  displayLabel: string;
}

// ============================================================================
// LOCATION POLICY
// ============================================================================

/**
 * Business policies that affect location interpretation.
 *
 * Current (RC1): NORMAL only.
 * Future (RC2): QUARANTINE, RECALL, EXPIRED, RETURN, HOLD.
 */
export type LocationPolicy =
  | "NORMAL"
  | "QUARANTINE"
  | "RECALL"
  | "EXPIRED"
  | "RETURN"
  | "HOLD";

// ============================================================================
// LOCATION HISTORY (Business — NOT Audit)
// ============================================================================
//
// ADR-009: Activity Log is Audit. Location History is Business History.
// INV-012: Location History is append-only — never modified after creation.

/** An entry in the business location history for a batch. */
export interface LocationHistoryEntry {
  id: string;
  tenantId: string;
  batchId: string;
  productId: string;
  /** Previous location (null = first assignment) */
  oldLocationId: string | null;
  /** New location (null = location removed) */
  newLocationId: string | null;
  /** ISO timestamp */
  changedAt: string;
  /** User ID who performed the change */
  changedBy: string;
  /** Optional reason for the move */
  reason: string | null;
  /** What triggered this change */
  source: LocationHistorySource;
}

export type LocationHistorySource =
  | "manual"        // Operator manually moved the batch
  | "purchase"      // Initial assignment from purchase
  | "system"        // Automated relocation
  | "batch_expiry"  // Batch expired → moved to expired area
  | "recall"        // Product recall
  | "return";       // Sales return

// ============================================================================
// VALIDATOR RESULT
// ============================================================================

/** Result of a location validation check. */
export interface ValidatorResult {
  valid: boolean;
  errors: string[];
}

/** Convenience factory for successful validation. */
export function validationPassed(): ValidatorResult {
  return { valid: true, errors: [] };
}

/** Convenience factory for failed validation. */
export function validationFailed(errors: string[]): ValidatorResult {
  return { valid: false, errors };
}

// ============================================================================
// EXTENSION POINTS (RC2 — not implemented)
// ============================================================================
//
// These contracts define the shape of future features without implementing them.
// Adding a feature = implementing the contract, not changing consumer code.

/** Bulk relocation — move multiple batches at once. */
export interface BulkRelocationInput {
  batchIds: string[];
  targetLocationId: string;
  operatorId: string;
  reason?: string | null;
}

/** Barcode-based location lookup result. */
export interface BarcodeLocationResult {
  barcode: string;
  location: LocationMaster | null;
  confidence: number; // 0-1
}

/** Warehouse scanner integration contract. */
export interface WarehouseScannerInput {
  scannedCode: string;
  scanType: "barcode" | "qrcode" | "rfid";
  timestamp: string;
  deviceId?: string;
}

/** Offline queue entry for deferred location sync. */
export interface OfflineLocationQueueEntry {
  id: string;
  action: "relocate" | "assign" | "clear";
  batchId: string;
  locationId: string | null;
  queuedAt: string;
  retryCount: number;
}

// ============================================================================
// REPOSITORY EXTENSION POINTS (RC2 — interfaces only)
// ============================================================================
//
// These interfaces define the contract for location data access.
// RC1: not implemented — location data comes from existing stores.
// RC2: implement these behind the engine for clean separation.
//
// The engine itself does NOT import or use these.
// They exist as contracts for the infrastructure layer to implement.

/** Provider: resolves location data from any source (DB, cache, mock). */
export interface LocationProvider {
  getById(id: string): Promise<LocationMaster | null>;
  getByCode(tenantId: string, code: string): Promise<LocationMaster | null>;
  listByTenant(tenantId: string): Promise<LocationMaster[]>;
  search(tenantId: string, query: string): Promise<LocationMaster[]>;
}

/** Repository: CRUD operations for location master data. */
export interface LocationRepository {
  create(input: {
    tenantId: string;
    code: string;
    name: string;
  }): Promise<LocationMaster>;
  update(id: string, input: {
    code?: string;
    name?: string;
    isActive?: boolean;
  }): Promise<LocationMaster | null>;
  softDelete(id: string): Promise<boolean>;
}

/** Repository: append-only history persistence. */
export interface LocationHistoryRepository {
  append(
    entry: import("./location-types").LocationHistoryEntry,
  ): Promise<string>;
  getByBatch(batchId: string): Promise<LocationHistoryEntry[]>;
  getByProduct(productId: string): Promise<LocationHistoryEntry[]>;
}
