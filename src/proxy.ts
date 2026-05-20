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

  const pathname = request.nextUrl.pathname;
  const trace = (tag: string, ...args: unknown[]) => {
    console.log(`[MEDISYNC-TRACE] [MIDDLEWARE:${tag}]`, ...args);
  };

  trace("REQUEST", "pathname =", pathname);

  // Demo mode or missing env: allow all traffic
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes("your-project") ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  ) {
    trace("BYPASS", "demo mode or missing env — allowing");
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        const cookies = request.cookies.getAll();
        trace("COOKIES_GETALL", "count =", cookies.length, "names =", cookies.map(c => c.name).join(", "));
        return cookies;
      },
      setAll(cookiesToSet) {
        trace("COOKIES_SETALL", "count =", cookiesToSet.length, "names =", cookiesToSet.map(c => c.name).join(", "));
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session (extends cookie lifetime)
  trace("GETSESSION", "calling supabase.auth.getSession()...");
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  trace("GETSESSION", "done. hasSession =", !!session, "userId =", session?.user?.id ?? null);

  /* ---- /login page: redirect to dashboard if signed in ---- */
  if (pathname.startsWith("/login")) {
    if (session) {
      trace("REDIRECT", "/login → /dashboard (already signed in)");
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    trace("PASS", "/login — no session, allowing through");
    return response;
  }

  /* ---- Public paths: allow through ---- */
  if (isPublicPath(pathname)) {
    trace("PASS", pathname, "— public path, allowing through");
    return response;
  }

  /* ---- Protected routes: require valid session ---- */
  if (!session) {
    trace("REDIRECT", pathname, "→ /login (no session)");
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  /* ---- Admin routes: require super_admin role ---- */
  if (isAdminPath(pathname)) {
    trace("ADMIN_CHECK", "checking role for", session.user.id);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile || profile.role !== "super_admin") {
      trace("REDIRECT", pathname, "→ /unauthorized (not super_admin)");
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    trace("ADMIN_CHECK", "super_admin confirmed, allowing");
  }

  trace("PASS", pathname, "— authenticated, allowing through");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
