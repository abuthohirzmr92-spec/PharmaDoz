"use server";

export async function sendPasswordResetEmail(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const appUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/recover`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        email,
        gotrue_meta_security: {
          redirect_to: `${appUrl}/auth/set-password`,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { success: false, error: (body as any).msg ?? body.error ?? `HTTP ${res.status}` };
  }

  return { success: true };
}
