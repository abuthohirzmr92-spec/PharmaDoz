import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SluggifiedLoginPage } from "./login-client";

export default async function TenantLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let tenant: any = null;
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      });

      const { data } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .is("deleted_at", null)
        .single();

      tenant = data;
    }
  } catch {
    // Fall through to notFound
  }

  if (!tenant || !tenant.is_active) {
    notFound();
  }

  const branding = {
    companyName: (tenant.settings?.company_name as string) ?? tenant.name,
    logoUrl: (tenant.settings?.logo_url as string) ?? null,
    address: (tenant.settings?.address as string) ?? null,
    phone: (tenant.settings?.phone as string) ?? null,
  };

  return (
    <SluggifiedLoginPage
      tenantName={tenant.name}
      branding={branding}
      tenantId={tenant.id}
    />
  );
}
