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
const PLATFORM_PREFIX = "/platform";

const ASSET_PREFIXES = ["/_next", "/api", "/favicon.ico"];

const SYSTEM_ROLES: ReadonlySet<string> = new Set([
  "super_admin",
  "developer",
  "support_ai",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return (
    ASSET_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.includes(".")
  );
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith(ADMIN_PREFIX) || pathname.startsWith(PLATFORM_PREFIX);
}

function isSystemRole(role: string | null | undefined): boolean {
  return typeof role === "string" && SYSTEM_ROLES.has(role);
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
        profile && isSystemRole(profile.role) ? "/platform" : "/dashboard";
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

  /* ---- Fetch profile once for role-based routing ---- */
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  const userRole = profile?.role ?? null;

  /* ---- Admin routes: require system role ---- */
  if (isAdminPath(request.nextUrl.pathname)) {
    if (profileError || !profile || !isSystemRole(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  /* ---- Tenant routes: redirect platform users to /platform ---- */
  if (isSystemRole(userRole) && !isAdminPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/platform", request.url));
  }

  /* ---- Platform routes: redirect tenant users to /dashboard ---- */
  if (userRole && !isSystemRole(userRole) && isAdminPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
