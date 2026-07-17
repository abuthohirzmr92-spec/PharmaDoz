// ---------------------------------------------------------------------------
// Plan comparison ViewModel helpers (PURE — no business rules, no money math)
// ---------------------------------------------------------------------------
// Consume already-fetched packages/features/usage and shape them for the
// comparison matrix + upgrade recommendation. Business decisions stay in the
// domain services; money math stays in the Money layer (calc.ts).
// ---------------------------------------------------------------------------

export interface PackageLite {
  id: string;
  name: string;
  label: string;
  monthlyPrice: number;
  maxUsers: number;
  maxBranches: number;
  maxProducts: number;
  features: Record<string, boolean>;
}

export interface UsageStat {
  resource: string;
  current: number;
  max: number | null;
}

export interface MatrixCell {
  packageId: string;
  enabled: boolean;
}

export interface MatrixRow {
  featureKey: string;
  label: string;
  cells: MatrixCell[];
}

/** Pure: build feature × package rows for the comparison matrix. */
export function buildComparisonMatrix(
  featureKeys: string[],
  labels: Record<string, string>,
  packages: Pick<PackageLite, "id" | "features">[],
): MatrixRow[] {
  return featureKeys.map((fk) => ({
    featureKey: fk,
    label: labels[fk] ?? fk,
    cells: packages.map((p) => ({ packageId: p.id, enabled: p.features[fk] === true })),
  }));
}

/**
 * Pure: recommend an upgrade package id, or null. Recommends only when usage is
 * near a limit; picks the cheapest package priced above the current one.
 */
export function recommendUpgrade(
  currentPrice: number,
  usage: UsageStat[],
  packages: PackageLite[],
): string | null {
  const nearLimit = usage.some((u) => u.max != null && u.max > 0 && u.current / u.max >= 0.9);
  if (!nearLimit) return null;
  const higher = packages
    .filter((p) => p.monthlyPrice > currentPrice)
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice);
  return higher[0]?.id ?? null;
}

/** Pure: feature keys enabled in `next` but not in `current` (upgrade impact). */
export function diffAddedFeatures(
  current: Record<string, boolean>,
  next: Record<string, boolean>,
): string[] {
  return Object.keys(next).filter((k) => next[k] === true && current[k] !== true);
}
