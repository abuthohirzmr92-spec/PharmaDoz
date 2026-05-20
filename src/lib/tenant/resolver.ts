import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import type { Tenant } from "@/types";

/**
 * Resolve tenant from hostname (subdomain-based multi-tenancy).
 * Example: sehat.apotek-manage.id → slug "sehat"
 */
export async function resolveTenantFromHost(
  hostname: string,
): Promise<Tenant | null> {
  if (!isSupabaseConnected()) return null;

  const host = hostname.split(":")[0] ?? "";
  if (!host) return null;

  const parts = host.split(".");
  if (parts.length < 2) return null;

  // For localhost subdomains like "pharm-001.localhost"
  if (host.endsWith(".localhost") || host.endsWith(".vercel.app")) {
    const slug = parts[0] ?? "";
    if (!slug) return null;
    return resolveTenantFromSlug(slug);
  }

  // Production: first segment is the tenant slug
  if (parts.length >= 3) {
    const slug = parts[0] ?? "";
    if (!slug) return null;
    return resolveTenantFromSlug(slug);
  }

  return null;
}

/**
 * Resolve tenant from its unique slug.
 */
export async function resolveTenantFromSlug(
  slug: string,
): Promise<Tenant | null> {
  if (!isSupabaseConnected()) return null;

  const { data, error } = await supabase!
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    return null;
  }

  const t = data as any;
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    domain: t.domain ?? null,
    settings: t.settings ?? {},
    isActive: t.is_active,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

/**
 * Resolve tenant from user's profile tenant_id.
 */
export async function resolveTenantFromProfile(
  profileId: string,
): Promise<Tenant | null> {
  if (!isSupabaseConnected()) return null;

  // First get the profile's tenant_id
  const { data: profile, error: profileError } = await supabase!
    .from("profiles")
    .select("tenant_id")
    .eq("id", profileId)
    .single();

  if (profileError || !(profile as any)?.tenant_id) return null;

  const { data, error } = await supabase!
    .from("tenants")
    .select("*")
    .eq("id", (profile as any).tenant_id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();

  if (error) return null;

  const t = data as any;
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    domain: t.domain ?? null,
    settings: t.settings ?? {},
    isActive: t.is_active,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}
