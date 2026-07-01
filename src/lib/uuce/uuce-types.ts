// =================================================================
// UUCE Types — Universal Unit Conversion Engine
// EEOS Business Core — Layer 0 Foundation
// Domain-agnostic. No healthcare, retail, or warehouse concepts.
// =================================================================

// ─── Unit Kind (domain-neutral) ───

export type UnitKind = "discrete" | "volume" | "mass" | "custom";

// ─── Package Type (domain-neutral) ───

export type PackageType = "primary" | "secondary" | "tertiary" | "transport";

// ─── Physical Category (domain-neutral) ───

export type PhysicalCategory = "solid" | "liquid" | "gas" | "semi_solid" | "powder";

// ─── Rounding Mode ───

export type RoundingMode = "floor" | "round" | "ceil" | "exact";

// ─── Unit Tree Node ───

export interface UnitTreeNode {
  /** Unique name within the product tree (e.g., "Strip", "Dus") */
  name: string;
  /** How many parent units in 1 of this unit */
  contains: number;
  /** Parent node (null = root/base unit) */
  parent: UnitTreeNode | null;
  /** Child nodes */
  children: UnitTreeNode[];
  /** Pre-computed: contains * parent.cumulativeMultiplier (1 for root) */
  cumulativeMultiplier: number;
  /** Distance from root (0 = base unit) */
  depth: number;

  // ─── Domain-agnostic metadata (UUCE stores but NEVER interprets) ───

  /** Structural packaging level */
  packageType?: PackageType;
  /** Physical form */
  physicalCategory?: PhysicalCategory;
  /** Domain classification (opaque to UUCE) */
  unitKind?: UnitKind;
  /**
   * Opaque extension bag for domain-specific metadata.
   * Healthcare: { clinicalCategory, requiresColdChain, ... }
   * Retail: { isPricePerKg, isLooseGoods, ... }
   * UUCE NEVER interprets this. Consumer engines do.
   */
  extensions?: Record<string, unknown>;
}

// ─── Unit Tree ───

export interface UnitTree {
  /** Product this tree belongs to */
  productId: string;
  /** Root node = base/canonical unit */
  root: UnitTreeNode;
  /** O(1) lookup by unit name */
  nodeMap: Map<string, UnitTreeNode>;
  /** SHA-256 hash of the canonical tree structure (for snapshot comparison) */
  treeHash: string;
  /** Monotonically increasing version per product */
  treeVersion: number;
  /** When this tree was built */
  builtAt: string;
}

// ─── Tree Validation ───

export interface TreeValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Conversion Snapshot ───

export interface ConversionSnapshot {
  /** FK to display_snapshots table */
  snapshotId: string;
  /** Product tree version at capture time */
  treeVersion: number;
  /** SHA-256 of tree structure at capture time */
  treeHash: string;
  /** The display unit name used */
  unitName: string;
  /** Snapshotted cumulative multiplier (for fast restore) */
  cumulativeMultiplier: number;
  /** When this snapshot was created */
  capturedAt: string;
  /** Product ID */
  productId: string;
}

// ─── Quantity ───

export interface Quantity {
  /** Canonical quantity in base unit (source of truth) */
  canonical: number;
  /** Canonical unit name */
  unit: string;
}

// ─── Display Quantity ───

export interface DisplayQuantity {
  /** Display quantity */
  value: number;
  /** Display unit name */
  unit: string;
}

// ─── Breakdown ───

export interface UnitBreakdown {
  unitName: string;
  quantity: number;
  remainder: number;
}

// ─── Compare Result ───

export interface CompareResult {
  equal: boolean;
  /** Positive if A > B in canonical, negative if A < B */
  difference: number;
  aCanonical: number;
  bCanonical: number;
}

// ─── Convert Result ───

export interface ConvertResult {
  /** The converted quantity */
  value: number;
  /** The target unit */
  unit: string;
  /** Rounding mode used */
  mode: RoundingMode;
  /** True if conversion resulted in precision loss */
  hasPrecisionLoss: boolean;
}

// ─── Sum Item ───

export interface SumItem {
  quantity: number;
  unit: string;
}
