"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export async function sendPasswordResetEmail(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerSupabase();

  // Don't pass redirectTo — let Supabase use the Site URL configured in
  // the dashboard. The root page will catch ?code= and forward to /auth/callback.
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
