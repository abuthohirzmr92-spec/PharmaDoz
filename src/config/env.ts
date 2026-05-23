/**
 * Environment configuration schema and parser.
 *
 * Modes:
 *   - **Demo mode** (NEXT_PUBLIC_DEMO_MODE=true): In-memory data, no Supabase.
 *     Used for local development and testing.
 *   - **Live mode** (default): Real Supabase Auth + database. Requires valid
 *     NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * NEXT_PUBLIC_APP_URL defines the canonical origin used for generated
 * links, redirects, and CORS policies. It should always be set to the
 * deployed domain in production.
 */

import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Apotek Manage"),
  NEXT_PUBLIC_DEMO_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  NEXT_PUBLIC_ENABLE_AUTH_DIAGNOSTICS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
    NEXT_PUBLIC_ENABLE_AUTH_DIAGNOSTICS: process.env.NEXT_PUBLIC_ENABLE_AUTH_DIAGNOSTICS,
  });

  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = parseEnv();

export function isDemoMode(): boolean {
  return env.NEXT_PUBLIC_DEMO_MODE;
}

export function isAuthDiagnosticsEnabled(): boolean {
  return env.NEXT_PUBLIC_ENABLE_AUTH_DIAGNOSTICS;
}
