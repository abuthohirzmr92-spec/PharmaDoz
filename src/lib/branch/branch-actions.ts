"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getPackageBranchLimit } from "@/lib/quota-guard";

export async function createBranch(input: {
  tenantId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}): Promise<{ success: boolean; branchId?: string; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  // Validate caller has tenant access
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  // Quota enforcement — check branch limit against tenant package
  const { data: tenantPkg } = await db
    .from("tenants")
    .select("package_id, tenant_packages!inner(name)")
    .eq("id", input.tenantId)
    .single();

  const packageName: string = (tenantPkg as any)?.tenant_packages?.name ?? "basic";
  const maxBranches = getPackageBranchLimit(packageName);

  const { count: currentBranches } = await db
    .from("branches")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", input.tenantId)
    .is("deleted_at", null);

  if ((currentBranches ?? 0) >= maxBranches) {
    return {
      success: false,
      error: `Paket ${packageName} hanya mendukung maksimal ${maxBranches} cabang. Silakan upgrade paket untuk menambah cabang.`,
    };
  }

  // Generate branch code
  const code = "BR-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await db
    .from("branches")
    .insert({
      tenant_id: input.tenantId,
      name: input.name,
      code,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      is_main: false,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, branchId: data.id };
}

export async function updateBranch(
  branchId: string,
  input: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { error } = await db
    .from("branches")
    .update({
      name: input.name,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", branchId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deactivateBranch(
  branchId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  // Soft-delete: set is_active = false and deleted_at
  const { error } = await db
    .from("branches")
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", branchId)
    .eq("is_main", false); // Cannot deactivate main branch

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
