import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/unauthorized",
  "/offline",
]);

const ADMIN_PREFIX = "/admin";

const ASSET_PREFIXES = ["/_next", "/api", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return (
    ASSET_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.includes(".")
  );
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith(ADMIN_PREFIX);
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Demo mode or missing env: allow all traffic
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes("your-project") ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session (extends cookie lifetime)
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  /* ---- /login page: redirect to role-appropriate page if signed in ---- */
  if (request.nextUrl.pathname.startsWith("/login")) {
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const target =
        profile && profile.role === "super_admin" ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return response;
  }

  /* ---- Public paths: allow through ---- */
  if (isPublicPath(request.nextUrl.pathname)) {
    return response;
  }

  /* ---- Protected routes: require valid session ---- */
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  /* ---- Admin routes: require super_admin role ---- */
  if (isAdminPath(request.nextUrl.pathname)) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile || profile.role !== "super_admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
