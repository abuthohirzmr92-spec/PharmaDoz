// ---------------------------------------------------------------------------
// Resource health (pure ViewModel) — usage vs limits with thresholds
// ---------------------------------------------------------------------------
// Presentation-only; no business rules. Maps raw usage/limit to a simple
// health status for the quota dashboard.
// ---------------------------------------------------------------------------

export type ResourceHealth = "ok" | "near" | "critical";

export interface ResourceHealthDatum {
  resource: string;
  current: number;
  max: number | null; // null = unlimited
  pct: number | null; // null when unlimited
  health: ResourceHealth;
}

const NEAR = 0.8;
const CRITICAL = 0.95;

export function resourceHealth(
  resource: string,
  current: number,
  max: number | null,
): ResourceHealthDatum {
  const pct = max && max > 0 ? current / max : null;
  let health: ResourceHealth = "ok";
  if (pct !== null) {
    if (pct >= CRITICAL) health = "critical";
    else if (pct >= NEAR) health = "near";
  }
  return { resource, current, max, pct, health };
}

/** Aggregate: count of each health level for dashboard summary. */
export function healthSummary(data: ResourceHealthDatum[]): { ok: number; near: number; critical: number } {
  return {
    ok: data.filter((d) => d.health === "ok").length,
    near: data.filter((d) => d.health === "near").length,
    critical: data.filter((d) => d.health === "critical").length,
  };
}
