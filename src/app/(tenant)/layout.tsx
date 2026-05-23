import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { TenantShell } from "./tenant-shell";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Demo mode or missing env — allow through without auth check
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes("your-project") ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  ) {
    return <TenantShell>{children}</TenantShell>;
  }

  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch (e) {
    console.error("[TENANT-LAYOUT] cookies() failed:", e);
    return <TenantShell>{children}</TenantShell>;
  }

  let supabase;
  try {
    supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only auth check — no need to set cookies in layout
        },
      },
    });
  } catch (e) {
    console.error("[TENANT-LAYOUT] createServerClient failed:", e);
    return <TenantShell>{children}</TenantShell>;
  }

  let sessionResult;
  try {
    sessionResult = await supabase.auth.getSession();
  } catch (e) {
    console.error("[TENANT-LAYOUT] getSession failed:", e);
    return <TenantShell>{children}</TenantShell>;
  }

  const { data } = sessionResult;

  if (!data.session) {
    redirect("/login");
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("system_role")
      .eq("id", data.session.user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[TENANT-LAYOUT] profiles query error:", profileError.message, profileError.code);
    }

    if (profile && isPlatformUser(profile.system_role)) {
      redirect("/platform");
    }
  } catch (e) {
    console.error("[TENANT-LAYOUT] profile check failed:", e);
    // Continue rendering — don't block tenant access on profile lookup failure
  }

  return <TenantShell>{children}</TenantShell>;
}
