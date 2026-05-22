"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export async function sendPasswordResetEmail(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerSupabase();

  // Derive the site URL from server-side env vars.
  // VERCEL_URL is set automatically on all Vercel deployments (no protocol).
  const siteUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
