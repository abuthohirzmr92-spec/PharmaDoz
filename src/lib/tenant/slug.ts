// =================================================================
// MEDISYNC — Tenant Slug Service (Branding Sprint 1)
// 🔒 Architecture Constitution v1.0
//
// Responsibility: Slug validation, generation, reserved word enforcement.
// Slug format: 3-30 chars, lowercase alphanumeric + hyphens only.
//
// Deterministic. No Date.now(). No Math.random(). No hidden fallbacks.
// =================================================================

import { RESERVED_SLUGS_SET } from "@/config/reserved-slugs";
import { SLUG_PATTERN } from "@/lib/validators/patterns";

const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

/**
 * Maximum suffix attempts when resolving slug collisions.
 * After this many attempts, the function throws — the caller
 * must resolve the collision at a higher level (admin intervention).
 */
const MAX_SUFFIX_ATTEMPTS = 100;

// ─── Validation ───

export interface SlugValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSlug(slug: string): SlugValidationResult {
  if (!slug || typeof slug !== "string") {
    return { valid: false, error: "Slug tidak boleh kosong." };
  }

  if (slug.length < MIN_LENGTH) {
    return { valid: false, error: `Slug minimal ${MIN_LENGTH} karakter.` };
  }

  if (slug.length > MAX_LENGTH) {
    return { valid: false, error: `Slug maksimal ${MAX_LENGTH} karakter.` };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return {
      valid: false,
      error: "Slug hanya boleh huruf kecil, angka, dan tanda hubung (-). Tidak boleh diawali atau diakhiri tanda hubung.",
    };
  }

  if (RESERVED_SLUGS_SET.has(slug)) {
    return { valid: false, error: `"${slug}" adalah kata yang dicadangkan. Silakan pilih slug lain.` };
  }

  return { valid: true };
}

// ─── Generation ───

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")   // Remove special chars
    .replace(/\s+/g, "-")            // Spaces → hyphens
    .replace(/-+/g, "-")             // Collapse multiple hyphens
    .replace(/^-|-$/g, "")           // Trim leading/trailing hyphens
    .slice(0, MAX_LENGTH);          // Truncate
}

/**
 * Generate a unique slug given a base and a set of existing slugs.
 *
 * Deterministic. No random fallback.
 * Throws if unable to generate a unique slug after MAX_SUFFIX_ATTEMPTS
 * — the caller must handle this at the application level (admin intervention).
 */
export function ensureUniqueSlug(base: string, existingSlugs: ReadonlySet<string>): string {
  if (!existingSlugs.has(base) && validateSlug(base).valid) {
    return base;
  }

  for (let suffix = 1; suffix <= MAX_SUFFIX_ATTEMPTS; suffix++) {
    const maxBase = MAX_LENGTH - String(suffix).length - 1;
    const trimmed = base.slice(0, maxBase);
    const candidate = `${trimmed}-${suffix}`;
    if (!existingSlugs.has(candidate) && validateSlug(candidate).valid) {
      return candidate;
    }
  }

  throw new Error(
    `Tidak dapat membuat slug unik untuk "${base}" setelah ${MAX_SUFFIX_ATTEMPTS} percobaan. ` +
    `Intervensi administrator diperlukan.`
  );
}

// ─── Reserved Check ───

export function isReserved(slug: string): boolean {
  return RESERVED_SLUGS_SET.has(slug.toLowerCase());
}

export function getReservedSlugs(): readonly string[] {
  return [...RESERVED_SLUGS_SET].sort();
}
