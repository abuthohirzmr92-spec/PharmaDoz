import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code && !accessToken) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const cookieStore = await cookies();
  const cookieJar: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookieJar.push(...cookiesToSet);
        },
      },
    },
  );

  let error: Error | null = null;

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (accessToken && refreshToken) {
    const result = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    error = result.error;
  }

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  for (const { name, value, options } of cookieJar) {
    response.cookies.set(name, value, options as any);
  }

  return response;
}
