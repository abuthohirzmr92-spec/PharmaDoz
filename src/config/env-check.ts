/**
 * Environment variable validation and mode detection.
 *
 * - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
 *   placeholder values (containing "your-" or "placeholder") → **demo mode**.
 *   Missing values → logged as info (treated as demo with warning).
 * - `NEXT_PUBLIC_APP_URL`: should always be set; a warning is emitted if absent.
 */
/* eslint-disable no-console */

const PLACEHOLDER_PATTERNS = [/your-/i, /placeholder/i];

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

export interface EnvCheckResult {
  isValid: boolean;
  warnings: string[];
  mode: "demo" | "live";
}

export function validateEnv(): EnvCheckResult {
  const warnings: string[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // --- Supabase URL check ---
  if (!supabaseUrl) {
    console.info("[env-check] NEXT_PUBLIC_SUPABASE_URL is not set — falling back to demo mode");
    warnings.push("NEXT_PUBLIC_SUPABASE_URL is not set");
  } else if (isPlaceholder(supabaseUrl)) {
    console.warn("[env-check] NEXT_PUBLIC_SUPABASE_URL contains a placeholder value — demo mode active");
    warnings.push("NEXT_PUBLIC_SUPABASE_URL is a placeholder — running in demo mode");
  }

  // --- Supabase anon key check ---
  if (!supabaseKey) {
    console.info("[env-check] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set — falling back to demo mode");
    warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  } else if (isPlaceholder(supabaseKey)) {
    console.warn("[env-check] NEXT_PUBLIC_SUPABASE_ANON_KEY contains a placeholder value — demo mode active");
    warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is a placeholder — running in demo mode");
  }

  // --- APP_URL check ---
  if (!appUrl) {
    console.warn("[env-check] NEXT_PUBLIC_APP_URL is not set — using default http://localhost:3000");
    warnings.push("NEXT_PUBLIC_APP_URL is not set");
  }

  const isDemo =
    !supabaseUrl ||
    !supabaseKey ||
    isPlaceholder(supabaseUrl) ||
    isPlaceholder(supabaseKey);

  return {
    isValid: warnings.length === 0,
    warnings,
    mode: isDemo ? "demo" : "live",
  };
}
