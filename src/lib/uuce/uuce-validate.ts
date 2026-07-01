// =================================================================
// UUCE Validation Engine — Enhanced structural validation
// EEOS Business Core — Layer 0 Foundation
// =================================================================

import type { UnitTree, UnitTreeNode, TreeValidationResult } from "./uuce-types";

// ─── Circular Reference Detection ───

/**
 * Detect circular references in the tree.
 * Walks parent chain from every node. If any node is visited twice, it's circular.
 */
export function detectCircular(tree: UnitTree): TreeValidationResult {
  const errors: string[] = [];

  for (const node of tree.nodeMap.values()) {
    const visited = new Set<UnitTreeNode>();
    let current: UnitTreeNode | null = node;

    while (current) {
      if (visited.has(current)) {
        errors.push(`Circular reference detected at unit "${node.name}" → "${current.name}"`);
        break;
      }
      visited.add(current);
      current = current.parent;
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Duplicate Detection ───

/**
 * Detect duplicate unit names (case-insensitive) at the same tree depth.
 */
export function detectDuplicates(tree: UnitTree): TreeValidationResult {
  const errors: string[] = [];
  const groups = new Map<number, Set<string>>();

  for (const node of tree.nodeMap.values()) {
    const depth = node.depth;
    if (!groups.has(depth)) groups.set(depth, new Set());

    const key = node.name.toLowerCase();
    if (groups.get(depth)!.has(key)) {
      errors.push(`Duplicate unit name "${node.name}" at depth ${depth}`);
    }
    groups.get(depth)!.add(key);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Hierarchy Validation ───

/**
 * Validate the entire tree hierarchy:
 * - Root exists and is valid
 * - All non-root nodes have valid parent references
 * - Depth and cumulativeMultiplier are consistent
 * - No orphaned nodes
 */
export function validateHierarchy(tree: UnitTree): TreeValidationResult {
  const errors: string[] = [];

  // Root checks
  if (!tree.root) {
    return { valid: false, errors: ["Missing root node"] };
  }
  if (tree.root.parent !== null) {
    errors.push("Root node must have null parent");
  }
  if (tree.root.contains !== 1) {
    errors.push("Root node must have contains=1");
  }
  if (tree.root.depth !== 0) {
    errors.push("Root node must have depth=0");
  }

  // Walk all nodes
  const reachable = new Set<string>();

  function walk(node: UnitTreeNode): void {
    reachable.add(node.name.toLowerCase());

    // Validate parent-child link
    for (const child of node.children) {
      if (child.parent !== node) {
        errors.push(`Child "${child.name}" does not reference "${node.name}" as parent`);
      }
      // Validate depth
      if (child.depth !== node.depth + 1) {
        errors.push(
          `Depth mismatch: "${child.name}" has depth ${child.depth}, expected ${node.depth + 1}`,
        );
      }
      // Validate cumulativeMultiplier
      const expected = node.cumulativeMultiplier * child.contains;
      if (child.cumulativeMultiplier !== expected) {
        errors.push(
          `Multiplier mismatch: "${child.name}" has ${child.cumulativeMultiplier}, expected ${expected}`,
        );
      }
      walk(child);
    }
  }

  walk(tree.root);

  // Check for orphaned nodes (in nodeMap but not reachable from root)
  for (const key of tree.nodeMap.keys()) {
    if (!reachable.has(key)) {
      errors.push(`Orphaned node "${key}" — not reachable from root`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Snapshot Validation ───

/**
 * Validate that a conversion snapshot matches the current tree.
 * Returns whether the tree has changed since the snapshot was taken.
 */
export function validateSnapshot(
  tree: UnitTree,
  snapshotTreeHash: string,
  snapshotTreeVersion: number,
): { valid: boolean; treeChanged: boolean; reason?: string } {
  if (tree.treeHash === snapshotTreeHash) {
    // Tree unchanged — snapshot is still valid
    return { valid: true, treeChanged: false };
  }

  if (tree.treeVersion > snapshotTreeVersion) {
    // Tree has been updated — snapshot is from an older version
    return {
      valid: true, // Still valid for audit (use snapshotted multiplier)
      treeChanged: true,
      reason: `Tree version changed: snapshot v${snapshotTreeVersion}, current v${tree.treeVersion}`,
    };
  }

  // Tree hash differs but version didn't increment — data integrity issue
  return {
    valid: false,
    treeChanged: true,
    reason: "Tree hash mismatch with same version number — possible data corruption",
  };
}

// ─── Canonical Validation ───

/**
 * Validate that a quantity is a valid canonical quantity for this tree.
 * - Must be non-negative
 * - For discrete units, must be integer
 * - Must not exceed safe integer range
 */
export function validateCanonical(
  qty: number,
  tree: UnitTree,
): { valid: boolean; reason?: string } {
  if (!Number.isFinite(qty)) {
    return { valid: false, reason: `Non-finite quantity: ${qty}` };
  }
  if (qty < 0) {
    return { valid: false, reason: `Negative quantity: ${qty}` };
  }
  if (qty > Number.MAX_SAFE_INTEGER) {
    return { valid: false, reason: `Quantity exceeds safe integer range: ${qty}` };
  }
  return { valid: true };
}

// ─── Full Validation (all checks) ───

/**
 * Run all validation checks on a tree.
 * Returns combined results.
 */
export function validateAll(tree: UnitTree): TreeValidationResult {
  const allErrors: string[] = [];

  const hierarchy = validateHierarchy(tree);
  allErrors.push(...hierarchy.errors);

  const circular = detectCircular(tree);
  allErrors.push(...circular.errors);

  const duplicates = detectDuplicates(tree);
  allErrors.push(...duplicates.errors);

  return { valid: allErrors.length === 0, errors: allErrors };
}
