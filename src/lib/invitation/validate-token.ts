"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export interface TokenValidationResult {
  valid: boolean;
  error?: string;
  invite?: {
    id: string;
    email: string;
    role: string;
    tenantName?: string;
  };
}

export async function validateInvitationToken(
  token: string,
): Promise<TokenValidationResult> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data: invite } = await db
    .from("invitation_tokens")
    .select("id, email, role, tenant_id, is_used, expires_at, tenant:tenant_id(name)")
    .eq("token", token)
    .single();

  if (!invite) {
    return { valid: false, error: "Link undangan tidak valid." };
  }

  if (invite.is_used) {
    return { valid: false, error: "Link undangan sudah digunakan." };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { valid: false, error: "Link undangan sudah kadaluarsa." };
  }

  return {
    valid: true,
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      tenantName: invite.tenant?.name ?? undefined,
    },
  };
}
