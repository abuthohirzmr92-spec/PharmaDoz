"use server";

export async function sendPasswordResetEmail(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const appUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const redirectTo = `${appUrl}/auth/set-password`;

  // TEMPORARY RUNTIME LOG — P0.AUTH.RESET-PASSWORD audit
  console.log("=== P0.AUTH.RESET-PASSWORD RUNTIME ===");
  console.log("VERCEL_URL:", process.env.VERCEL_URL);
  console.log("NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);
  console.log("appUrl:", appUrl);
  console.log("redirectTo sent:", redirectTo);
  console.log("payload sent:", JSON.stringify({ email, options: { redirectTo } }, null, 2));
  console.log("=== END P0.AUTH RUNTIME ===");

  // Supabase GoTrue /auth/v1/recover — correct parameter format (v2+)
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
        options: {
          redirectTo,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { success: false, error: (body as any).msg ?? (body as any).message ?? `HTTP ${res.status}` };
  }

  return { success: true };
}
