import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { TenantShell } from "./tenant-shell";

function hasValidSupabaseEnv(url: string | undefined, key: string | undefined): boolean {
  return !!url && !!key && !url.includes("your-project");
}

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasValidSupabaseEnv(supabaseUrl, supabaseKey)) {
    redirect("/login");
  }

  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch (e) {
    console.error("[TENANT-LAYOUT] cookies() failed:", e);
    redirect("/login");
  }

  let supabase;
  try {
    supabase = createServerClient(supabaseUrl!, supabaseKey!, {
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
    redirect("/login");
  }

  let sessionResult;
  try {
    sessionResult = await supabase.auth.getSession();
  } catch (e) {
    console.error("[TENANT-LAYOUT] getSession failed:", e);
    redirect("/login");
  }

  const { data, error: sessionError } = sessionResult;

  if (sessionError || !data.session?.user?.id) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id, system_role, is_active")
    .eq("id", data.session.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    console.error("[TENANT-LAYOUT] profile validation failed:", profileError?.message, profileError?.code);
    redirect("/unauthorized");
  }

  if (isPlatformUser(profile.system_role)) {
    redirect("/platform");
  }

  if (!profile.tenant_id) {
    redirect("/unauthorized");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .eq("user_id", data.session.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error("[TENANT-LAYOUT] tenant validation failed:", membershipError?.message, membershipError?.code);
    redirect("/unauthorized");
  }

  return <TenantShell>{children}</TenantShell>;
}
