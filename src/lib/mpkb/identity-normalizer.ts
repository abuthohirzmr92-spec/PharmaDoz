// ---------------------------------------------------------------------------
// RC1.5 P1D — Product Identity Normalization
// ---------------------------------------------------------------------------
// Pure functions. Zero side effects.
// Prevents false duplicates caused by spelling/formatting variations.
// ---------------------------------------------------------------------------

// ============================================================================
// Manufacturer Normalization
// ============================================================================

/**
 * Normalize manufacturer name for comparison.
 * Removes legal suffixes, punctuation, and whitespace.
 *
 * Examples:
 *   "PT Kimia Farma"     → "kimia farma"
 *   "Kimia Farma Tbk"    → "kimia farma"
 *   "PT. SANBE FARMA"    → "sanbe farma"
 */
export function normalizeManufacturer(raw: string): string {
  if (!raw?.trim()) return "";
  return raw
    .toLowerCase()
    .replace(/\b(pt|pt\.?|cv|ud|tbk|ltd|inc|llc|co)\b\.?/gi, "") // remove legal entities
    .replace(/[^\w\s]/g, "")    // remove punctuation
    .replace(/\s+/g, " ")        // collapse spaces
    .trim();
}

// ============================================================================
// Strength Normalization
// ============================================================================

/**
 * Normalize drug strength to standard "X mg" or "X ml" format.
 * Converts grams → milligrams for consistency.
 *
 * Examples:
 *   500mg    → "500 mg"
 *   500 MG   → "500 mg"
 *   0.5 g    → "500 mg"
 *   500mg/5ml → "500 mg/5 ml"
 *   20mg/ml  → "20 mg/ml"
 */
export function normalizeStrength(raw: string): string {
  if (!raw?.trim()) return "";
  let s = raw.toLowerCase().trim().replace(/\s+/g, "");

  // Handle "0.5g" style → convert to mg
  const gramMatch = s.match(/^([0-9.]+)\s*g$/);
  if (gramMatch) {
    const grams = parseFloat(gramMatch[1]!);
    if (!isNaN(grams)) return `${Math.round(grams * 1000)} mg`;
  }

  // Handle "500mg/5ml" style
  const ratioMatch = s.match(/^([0-9.]+)\s*(mg|ml|g)\s*\/\s*([0-9.]+)\s*(ml|mg)$/);
  if (ratioMatch) {
    const num = parseFloat(ratioMatch[1]!);
    const unit1 = ratioMatch[2]! === "g" ? "g" : ratioMatch[2]!;
    const denom = parseFloat(ratioMatch[3]!);
    const unit2 = ratioMatch[4]!;
    const convertedNum = unit1 === "g" ? Math.round(num * 1000) : num;
    return `${convertedNum} mg/${denom} ${unit2}`;
  }

  // Handle "500mg" style
  const simpleMatch = s.match(/^([0-9.]+)\s*(mg|ml|g|mcg)$/);
  if (simpleMatch) {
    const num = parseFloat(simpleMatch[1]!);
    const unit = simpleMatch[2]!;
    if (unit === "g") return `${Math.round(num * 1000)} mg`;
    if (unit === "mcg") return `${Math.round(num / 1000)} mg`;
    return `${num} ${unit}`;
  }

  // Fallback: add space between number and unit
  return s.replace(/([0-9.]+)([a-z]+)/g, "$1 $2");
}

// ============================================================================
// Dosage Form Canonicalization
// ============================================================================

export const CANONICAL_DOSAGE_FORMS = [
  "TABLET", "KAPSUL", "KAPLET", "SIRUP", "SALEP",
  "INJEKSI", "DROP", "SUPPOSITORIA", "VIAL", "AMPUL",
  "SERBUK", "SUSPENSI",
] as const;

export type CanonicalDosageForm = typeof CANONICAL_DOSAGE_FORMS[number];

const DOSAGE_FORM_MAP: Record<string, CanonicalDosageForm> = {
  tablet: "TABLET", tab: "TABLET", tbl: "TABLET", "obat tablet": "TABLET",
  kapsul: "KAPSUL", capsule: "KAPSUL", cap: "KAPSUL", caps: "KAPSUL",
  kaplet: "KAPLET", caplet: "KAPLET",
  sirup: "SIRUP", syrup: "SIRUP", sir: "SIRUP",
  salep: "SALEP", ointment: "SALEP", cream: "SALEP", krim: "SALEP",
  injeksi: "INJEKSI", injection: "INJEKSI", inj: "INJEKSI",
  drop: "DROP", drops: "DROP", tetes: "DROP",
  suppositoria: "SUPPOSITORIA", supp: "SUPPOSITORIA", suppository: "SUPPOSITORIA",
  vial: "VIAL",
  ampul: "AMPUL", ampoule: "AMPUL", amp: "AMPUL",
  serbuk: "SERBUK", powder: "SERBUK", pwd: "SERBUK",
  suspensi: "SUSPENSI", suspension: "SUSPENSI", susp: "SUSPENSI",
};

/**
 * Normalize dosage form to canonical code.
 * Returns null if unrecognized.
 */
export function normalizeDosageForm(raw: string): CanonicalDosageForm | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase();
  return DOSAGE_FORM_MAP[key] ?? null;
}

// ============================================================================
// Full Identity Normalization
// ============================================================================

export interface NormalizedIdentity {
  manufacturerRaw: string;
  manufacturerNormalized: string;
  strengthRaw: string;
  strengthNormalized: string;
  dosageFormRaw: string;
  dosageFormCode: CanonicalDosageForm | null;
}

/**
 * Normalize all identity fields at once.
 */
export function normalizeIdentity(identity: {
  manufacturer?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
}): NormalizedIdentity {
  const manufacturerRaw = identity.manufacturer?.trim() || "";
  const strengthRaw = identity.strength?.trim() || "";
  const dosageFormRaw = identity.dosageForm?.trim() || "";

  return {
    manufacturerRaw,
    manufacturerNormalized: normalizeManufacturer(manufacturerRaw),
    strengthRaw,
    strengthNormalized: normalizeStrength(strengthRaw),
    dosageFormRaw,
    dosageFormCode: normalizeDosageForm(dosageFormRaw),
  };
}
