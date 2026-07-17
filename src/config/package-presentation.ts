// ---------------------------------------------------------------------------
// Package presentation (config, PURE) — "why upgrade?" marketing copy
// ---------------------------------------------------------------------------
// Presentation-only: recommended-for, value highlights, and an optional badge.
// NO business logic. Future phases may source this from configuration; the
// getter provides a safe fallback. Packages ≠ Add-ons (kept separate).
// ---------------------------------------------------------------------------

export type PackageBadge = "popular" | "best_value";

export interface PackagePresentation {
  recommendedFor: string;
  highlights: string[];
  badge?: PackageBadge;
}

const PRESENTATION: Record<string, PackagePresentation> = {
  basic: { recommendedFor: "Apotek baru", highlights: ["Operasional inti", "1 cabang", "Dukungan email"] },
  professional: {
    recommendedFor: "Apotek yang sedang berkembang",
    highlights: ["Multi-cabang", "Laporan lanjutan", "Dukungan prioritas"],
    badge: "popular",
  },
  enterprise: {
    recommendedFor: "Jaringan / rantai apotek",
    highlights: ["Kapasitas besar", "AI & Insight Bisnis", "Akses API", "Dedicated support"],
    badge: "best_value",
  },
};

const FALLBACK: PackagePresentation = { recommendedFor: "—", highlights: [] };

export function packagePresentation(name: string): PackagePresentation {
  return PRESENTATION[name] ?? FALLBACK;
}
