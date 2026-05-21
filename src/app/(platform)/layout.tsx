import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { PlatformShell } from "./platform-shell";

export default async function PlatformLayout({
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
    return <PlatformShell>{children}</PlatformShell>;
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Read-only auth check — no need to set cookies in layout
      },
    },
  });

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", data.session.user.id)
    .single();

  if (!profile || !isPlatformUser(profile.system_role)) {
    redirect("/dashboard");
  }

  return <PlatformShell>{children}</PlatformShell>;
}
