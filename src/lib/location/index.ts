// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                    LOCATION MANAGEMENT ENGINE                            ║
// ║                    PURE DOMAIN LAYER                                     ║
// ║                                                                          ║
// ║  FORBIDDEN IMPORTS:                                                      ║
// ║    ❌ React         ❌ Zustand        ❌ Supabase                        ║
// ║    ❌ Repository    ❌ Store          ❌ UI / JSX                        ║
// ║    ❌ Window        ❌ Document       ❌ localStorage                    ║
// ║    ❌ fetch/axios   ❌ toast/sonner   ❌ router/navigation               ║
// ║                                                                          ║
// ║  ALLOWED IMPORTS:                                                        ║
// ║    ✅ Internal engine modules (./location-*)                             ║
// ║    ✅ Pure type imports only                                             ║
// ║                                                                          ║
// ║  ADR-007: Location Management Engine is the Single Source of Truth.     ║
// ║  INV-008: Every displayed location must come from this engine.          ║
// ║  INV-010: No UI may calculate effective location.                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ============================================================================
// SECTION 1: TYPES — Domain Contracts
// ============================================================================
export type {
  // Core
  LocationMaster,
  EffectiveLocation,
  // Resolution
  LocationResolutionSource,
  LocationResolutionInput,
  LocationResolutionOutput,
  // Policy
  LocationPolicy,
  // History
  LocationHistoryEntry,
  LocationHistorySource,
  // Validator
  ValidatorResult,
  // Repository Extension Points (RC2)
  LocationProvider,
  LocationRepository,
  LocationHistoryRepository,
  // Extension Points (RC2)
  BulkRelocationInput,
  BarcodeLocationResult,
  WarehouseScannerInput,
  OfflineLocationQueueEntry,
} from "./location-types";

export {
  validationPassed,
  validationFailed,
} from "./location-types";

// ============================================================================
// SECTION 2: RESOLUTION — Location Resolution Chain
// ============================================================================
export {
  resolveLocationChain,
  isExplicitAssignment,
  isLegacyResolution,
  hasLocation,
  shouldInheritFromProduct,
} from "./location-resolution";

// ============================================================================
// SECTION 3: EFFECTIVE LOCATION — Main Entry Point
// ============================================================================
export {
  resolveEffectiveLocation,
  resolveEffectiveLocationId,
  effectiveLocationFromMaster,
} from "./effective-location";

export type { LocationMasterLookup } from "./effective-location";

// ============================================================================
// SECTION 4: VALIDATOR — Location Validation
// ============================================================================
export {
  validateLocation,
  validateLocationId,
  validateRelocation,
  validateBatchForLocation,
  validateAll,
} from "./location-validator";

export type { ValidationContext } from "./location-validator";

// ============================================================================
// SECTION 5: HISTORY — Business Location History
// ============================================================================
export {
  createHistoryEntry,
  filterHistoryByBatch,
  filterHistoryByProduct,
  getLatestLocationChange,
  getCurrentLocationFromHistory,
  countRelocations,
  buildLocationTimeline,
} from "./location-history";

export type { LocationHistoryParams } from "./location-history";

// ============================================================================
// SECTION 6: POLICY — Location Policy Engine
// ============================================================================
export {
  applyLocationPolicy,
  isEligibleForPolicy,
  getPolicyLabel,
  POLICY_LABELS,
} from "./location-policy";

// ============================================================================
// SECTION 7: MAPPER — Display / Formatting (View-Model Boundary)
// ============================================================================
export {
  buildDisplayLabel,
  formatLocationDisplay,
  getLocationBadgeVariant,
  LOCATION_DISPLAY_LABELS,
} from "./location-mapper";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EXTENSION POINTS (RC2)                                                 ║
// ║                                                                          ║
// ║  Adding a new policy:                                                    ║
// ║    1. Add value to LocationPolicy enum (location-types.ts)               ║
// ║    2. Add case in applyLocationPolicy() (location-policy.ts)            ║
// ║    3. Add label in POLICY_LABELS (location-policy.ts)                   ║
// ║                                                                          ║
// ║  Adding a new validator:                                                 ║
// ║    1. Create validator function in validators/                           ║
// ║    2. Re-export from location-validator.ts                               ║
// ║    3. Add to barrel export above (Section 4)                             ║
// ║                                                                          ║
// ║  Adding a repository implementation:                                     ║
// ║    1. Implement LocationRepository interface (location-types.ts)         ║
// ║    2. Wire behind engine — engine itself does NOT import it              ║
// ║    3. Inject via function parameter (dependency inversion)               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
