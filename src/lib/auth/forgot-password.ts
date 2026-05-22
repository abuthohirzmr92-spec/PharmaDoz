"use server";

export async function sendPasswordResetEmail(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Direct REST API call — bypasses PKCE setup entirely.
  // Without code_challenge, Supabase uses implicit flow and the recovery
  // link redirects back with access_token in the hash fragment.
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/recover`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ email }),
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { success: false, error: (body as any).msg ?? body.error ?? `HTTP ${res.status}` };
  }

  return { success: true };
}
