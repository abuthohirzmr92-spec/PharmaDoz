// =================================================================
// UUCE Tree Engine — UnitTree data structure and operations
// EEOS Business Core — Layer 0 Foundation
// Domain-agnostic. Pure functions. Zero side effects.
// =================================================================

import type {
  UnitTree,
  UnitTreeNode,
  TreeValidationResult,
  PackageType,
  PhysicalCategory,
  UnitKind,
} from "./uuce-types";

// ─── Build Tree ───

/**
 * Build a UnitTree from product unit level data.
 *
 * Input format (backward-compatible with existing product.unitLevels):
 *   baseUnit: "Tablet"
 *   unitLevels: [{ level: 2, unitName: "Strip", contains: 10 }, { level: 3, unitName: "Dus", contains: 20 }]
 *
 * The tree is built from root (base unit) outward.
 * Level 1 = root (base unit), Level 2 = first child, Level 3 = second child, etc.
 *
 * Supports arbitrary depth via parent-child chain.
 */
export function buildTree(params: {
  productId: string;
  baseUnit: string;
  unitLevels: Array<{
    id?: string;
    level: number;
    unitName: string;
    contains: number;
    parentUnitName?: string;
    metadata?: Record<string, unknown>;
  }>;
  treeVersion?: number;
}): UnitTree {
  const { productId, baseUnit, unitLevels, treeVersion = 1 } = params;

  // Sort by level ascending
  const sorted = [...unitLevels].sort((a, b) => a.level - b.level);

  // Create root node (base unit)
  const root: UnitTreeNode = {
    name: baseUnit,
    contains: 1,
    parent: null,
    children: [],
    cumulativeMultiplier: 1,
    depth: 0,
    unitKind: inferUnitKind(baseUnit),
  };

  const nodeMap = new Map<string, UnitTreeNode>();
  nodeMap.set(baseUnit.toLowerCase(), root);

  // Build child nodes in level order
  for (const level of sorted) {
    const parentName = level.parentUnitName
      ? level.parentUnitName
      : level.level === 2
        ? baseUnit
        : sorted.find((l) => l.level === level.level - 1)?.unitName ?? baseUnit;

    const parent = nodeMap.get(parentName.toLowerCase());
    if (!parent) {
      throw new Error(`UUCE: Parent unit "${parentName}" not found for "${level.unitName}"`);
    }

    const node: UnitTreeNode = {
      name: level.unitName,
      contains: level.contains,
      parent,
      children: [],
      cumulativeMultiplier: parent.cumulativeMultiplier * level.contains,
      depth: parent.depth + 1,
      unitKind: inferUnitKind(level.unitName),
      packageType: inferPackageType(level.level, sorted.length),
      physicalCategory: inferPhysicalCategory(baseUnit, level.unitName),
      extensions: level.metadata ?? {},
    };

    parent.children.push(node);
    nodeMap.set(level.unitName.toLowerCase(), node);
  }

  // Compute tree hash
  const treeHash = computeTreeHash(root);

  return {
    productId,
    root,
    nodeMap,
    treeHash,
    treeVersion,
    builtAt: new Date().toISOString(),
  };
}

// ─── Lookup ───

/** O(1) node lookup by unit name (case-insensitive) */
export function getNode(tree: UnitTree, unitName: string): UnitTreeNode | undefined {
  return tree.nodeMap.get(unitName.toLowerCase());
}

/** Get all node names in the tree */
export function getUnitNames(tree: UnitTree): string[] {
  return Array.from(tree.nodeMap.keys());
}

// ─── Walk Path ───

/** Walk from one node to another, returning all nodes in between */
export function walkPath(
  tree: UnitTree,
  fromUnit: string,
  toUnit: string,
): UnitTreeNode[] {
  const from = getNode(tree, fromUnit);
  const to = getNode(tree, toUnit);
  if (!from || !to) return [];

  // Walk up from 'from' to root, collecting nodes
  const fromPath: UnitTreeNode[] = [];
  let current: UnitTreeNode | null = from;
  while (current) {
    fromPath.push(current);
    current = current.parent;
  }

  // Walk up from 'to' to root, collecting nodes
  const toPath: UnitTreeNode[] = [];
  current = to;
  while (current) {
    toPath.push(current);
    current = current.parent;
  }

  // Find common ancestor, then build full path
  return fromPath.concat(toPath.reverse());
}

// ─── Validate Tree ───

/**
 * Validate tree structural integrity.
 * UUCE validates STRUCTURE only. Does NOT interpret metadata semantics.
 */
export function validateTree(tree: UnitTree): TreeValidationResult {
  const errors: string[] = [];

  // Must have root
  if (!tree.root) {
    errors.push("Tree has no root node");
    return { valid: false, errors };
  }

  // Root must be base unit (contains=1, parent=null, depth=0)
  if (tree.root.contains !== 1) {
    errors.push(`Root unit "${tree.root.name}" must have contains=1`);
  }
  if (tree.root.parent !== null) {
    errors.push("Root node must have null parent");
  }
  if (tree.root.depth !== 0) {
    errors.push("Root node must have depth=0");
  }

  // Validate all nodes
  const visited = new Set<string>();
  const queue: UnitTreeNode[] = [tree.root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    const key = node.name.toLowerCase();

    // Duplicate check
    if (visited.has(key)) {
      errors.push(`Duplicate unit name: "${node.name}"`);
    }
    visited.add(key);

    // Contains must be positive
    if (node.contains <= 0) {
      errors.push(`Unit "${node.name}": contains must be > 0, got ${node.contains}`);
    }

    // Cumulative multiplier must be correct
    const expectedMultiplier = node.parent
      ? node.parent.cumulativeMultiplier * node.contains
      : 1;
    if (node.cumulativeMultiplier !== expectedMultiplier) {
      errors.push(
        `Unit "${node.name}": cumulativeMultiplier mismatch. Expected ${expectedMultiplier}, got ${node.cumulativeMultiplier}`,
      );
    }

    // Depth must be correct
    const expectedDepth = node.parent ? node.parent.depth + 1 : 0;
    if (node.depth !== expectedDepth) {
      errors.push(`Unit "${node.name}": depth mismatch. Expected ${expectedDepth}, got ${node.depth}`);
    }

    // Children must reference this node as parent
    for (const child of node.children) {
      if (child.parent !== node) {
        errors.push(`Child "${child.name}" does not reference "${node.name}" as parent`);
      }
    }

    // Enqueue children
    queue.push(...node.children);
  }

  // Circular reference check (should never happen with tree structure, but guard)
  if (queue.length === 0 && visited.size !== tree.nodeMap.size) {
    errors.push(`Node count mismatch: visited ${visited.size}, map has ${tree.nodeMap.size}`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Helpers ───

/** Infer unit kind from name heuristics (domain-agnostic) */
function inferUnitKind(name: string): UnitKind {
  const lower = name.toLowerCase();
  if (/tablet|kapsul|kaplet|pil|pcs|ampul|vial|sachet|supp|buah|lembar|botol/i.test(lower)) {
    return "discrete";
  }
  if (/ml|liter|cc|tetes|drop|fl\.?\s*oz/i.test(lower)) {
    return "volume";
  }
  if (/gram|mg|kg|mcg|μg|ounce|oz|lb|pound/i.test(lower)) {
    return "mass";
  }
  return "custom";
}

/** Infer package type from level position */
function inferPackageType(level: number, maxLevel: number): PackageType {
  if (level === 2) return "primary";
  if (level === 3) return "secondary";
  if (level === 4) return "tertiary";
  return "transport";
}

/** Infer physical category from unit names (domain-agnostic) */
function inferPhysicalCategory(
  baseUnit: string,
  _childUnit: string,
): PhysicalCategory {
  const lower = baseUnit.toLowerCase();
  if (/ml|l|liter|cc|tetes|drop/i.test(lower)) return "liquid";
  if (/gram|mg|kg|ounce|powder|serbuk/i.test(lower)) return "powder";
  if (/salep|cream|gel|ointment|semi/i.test(lower)) return "semi_solid";
  if (/gas|aerosol|spray|inhaler/i.test(lower)) return "gas";
  return "solid";
}

/** Compute SHA-256-like hash of tree structure (simplified for V1) */
function computeTreeHash(root: UnitTreeNode): string {
  const parts: string[] = [];

  function walk(node: UnitTreeNode): void {
    parts.push(`${node.name}:${node.contains}:${node.depth}`);
    for (const child of node.children) {
      walk(child);
    }
  }

  walk(root);
  const canonical = parts.join("|");
  // Simple hash for V1 — in production, use crypto.subtle.digest("SHA-256")
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    const ch = canonical.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0; // Convert to 32-bit integer
  }
  return `uuce-${Math.abs(hash).toString(36)}`;
}
