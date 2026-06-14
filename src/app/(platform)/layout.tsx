import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { PlatformShell } from "./platform-shell";

function hasValidSupabaseEnv(url: string | undefined, key: string | undefined): boolean {
  return !!url && !!key && !url.includes("your-project");
}

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasValidSupabaseEnv(supabaseUrl, supabaseKey)) {
    redirect("/login");
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Read-only auth check — no need to set cookies in layout
      },
    },
  });

  const { data, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !data.session?.user?.id) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", data.session.user.id)
    .single();

  if (profileError || !profile || !isPlatformUser(profile.system_role)) {
    redirect("/dashboard");
  }

  return <PlatformShell>{children}</PlatformShell>;
}
