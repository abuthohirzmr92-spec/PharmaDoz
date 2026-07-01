// =================================================================
// UUCE — Universal Unit Conversion Engine
// Public API — single import point
// EEOS Business Core — Layer 0 Foundation
// =================================================================

// Types
export type {
  UnitTree,
  UnitTreeNode,
  UnitKind,
  PackageType,
  PhysicalCategory,
  RoundingMode,
  ConversionSnapshot,
  Quantity,
  DisplayQuantity,
  UnitBreakdown,
  CompareResult,
  ConvertResult,
  SumItem,
  TreeValidationResult,
} from "./uuce-types";

// Tree Engine
export { buildTree, getNode, getUnitNames, walkPath, validateTree } from "./uuce-tree";

// Core API
export {
  normalize,
  format,
  convert,
  breakdown,
  compare,
  sum,
  snapshot,
  restore,
  validate,
} from "./uuce-engine";

// Registry
export { getTree, buildAndCache, preload, invalidate, invalidateAll, getCacheStats } from "./uuce-registry";

// Validation
export {
  detectCircular,
  detectDuplicates,
  validateHierarchy,
  validateSnapshot,
  validateCanonical,
  validateAll,
} from "./uuce-validate";

// Precision
export { safeMultiply, safeDivide, roundTo, validateQuantity } from "./uuce-precision";
