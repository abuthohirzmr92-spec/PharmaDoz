// ---------------------------------------------------------------------------
// Operational badge standard (config, PURE)
// ---------------------------------------------------------------------------
// Consistent badge language across the Platform Portal. Variant must be a
// value accepted by AppBadge (success|warning|danger|info|neutral).
// ---------------------------------------------------------------------------

export type OperationalStatus = "healthy" | "warning" | "critical" | "info" | "experimental" | "certified" | "sandbox" | "production";

export interface OperationalBadge {
  variant: "success" | "warning" | "danger" | "info" | "neutral";
  icon: string;
  label: string;
}

const BADGES: Record<OperationalStatus, OperationalBadge> = {
  healthy:       { variant: "success",  icon: "🟢", label: "Sehat" },
  warning:       { variant: "warning",  icon: "🟡", label: "Perhatian" },
  critical:      { variant: "danger",   icon: "🔴", label: "Kritis" },
  info:          { variant: "info",     icon: "🔵", label: "Informasi" },
  experimental:  { variant: "neutral",  icon: "🟣", label: "Experimental" },
  certified:     { variant: "success",  icon: "⭐", label: "Certified" },
  sandbox:       { variant: "neutral",  icon: "⚪", label: "Sandbox" },
  production:    { variant: "success",  icon: "⚫", label: "Production" },
};

export function operationalBadge(status: OperationalStatus): OperationalBadge {
  return BADGES[status] ?? BADGES.info;
}
