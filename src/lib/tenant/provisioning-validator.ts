import { createServerSupabase } from "@/lib/supabase/server";
import { generateSlug } from "./onboarding";
import type { ProvisioningInput, ProvisioningError } from "@/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationContext {
  valid: true;
  ownerEmail: string;
  ownerDisplayName: string;
  tenantName: string;
  slug: string;
  packageId: string;
  domain: string | null;
  settings: Record<string, unknown>;
}

export interface ValidationFailure {
  valid: false;
  errors: ProvisioningError[];
}

export type ValidationResult = ValidationContext | ValidationFailure;

/**
 * Pure synchronous validation — no DB queries.
 */
function validateFields(input: ProvisioningInput): ProvisioningError[] {
  const errors: ProvisioningError[] = [];

  if (!input.ownerEmail || !EMAIL_RE.test(input.ownerEmail)) {
    errors.push({
      code: "VALIDATION_ERROR",
      message: "Email pemilik tidak valid.",
      field: "ownerEmail",
      retryable: false,
    });
  }

  if (!input.ownerDisplayName || input.ownerDisplayName.trim().length < 2) {
    errors.push({
      code: "VALIDATION_ERROR",
      message: "Nama pemilik minimal 2 karakter.",
      field: "ownerDisplayName",
      retryable: false,
    });
  }

  if (!input.tenantName || input.tenantName.trim().length < 2) {
    errors.push({
      code: "VALIDATION_ERROR",
      message: "Nama apotek minimal 2 karakter.",
      field: "tenantName",
      retryable: false,
    });
  }

  if (input.domain && !/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(input.domain)) {
    errors.push({
      code: "VALIDATION_ERROR",
      message: "Format domain tidak valid.",
      field: "domain",
      retryable: false,
    });
  }

  return errors;
}

/**
 * Full validation incl. slug availability and package resolution against DB.
 * Called from the server action before auth user creation.
 */
export async function validateProvisioning(
  input: ProvisioningInput,
): Promise<ValidationResult> {
  const errors = validateFields(input);
  if (errors.length > 0) return { valid: false, errors };

  const slug = input.slug || generateSlug(input.tenantName);
  if (slug.length < 2) {
    return {
      valid: false,
      errors: [{
        code: "VALIDATION_ERROR",
        message: "Slug terlalu pendek. Gunakan nama apotek yang lebih panjang.",
        field: "slug",
        retryable: false,
      }],
    };
  }

  const packageSlug = input.packageSlug ?? "basic";

  // Resolve package from database
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data: pkgRow, error: pkgError } = await db
    .from("tenant_packages")
    .select("id, name, is_active")
    .eq("name", packageSlug)
    .single();

  if (pkgError || !pkgRow) {
    return {
      valid: false,
      errors: [{
        code: "VALIDATION_ERROR",
        message: `Paket "${packageSlug}" tidak ditemukan di database. Pastikan paket sudah dikonfigurasi di Package Management.`,
        field: "packageSlug",
        retryable: false,
      }],
    };
  }

  if (!pkgRow.is_active) {
    return {
      valid: false,
      errors: [{
        code: "VALIDATION_ERROR",
        message: `Paket "${packageSlug}" saat ini tidak aktif. Aktifkan di Package Management.`,
        field: "packageSlug",
        retryable: false,
      }],
    };
  }

  const packageId = pkgRow.id as string;

  // Slug availability check (best-effort — final validation is in the DB function)
  try {
    const { count, error } = await db
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("slug", slug)
      .is("deleted_at", null);

    if (error) {
      // Non-fatal: DB function will catch duplicate slug
    } else if (count && count > 0) {
      return {
        valid: false,
        errors: [{
          code: "RACE_CONSTRAINT",
          message: `Slug "${slug}" sudah digunakan. Coba gunakan nama apotek yang berbeda.`,
          field: "slug",
          retryable: true,
          suggestion: "Gunakan nama apotek yang berbeda untuk menghasilkan slug unik.",
        }],
      };
    }
  } catch {
    // Non-fatal — DB function has final say
  }

  return {
    valid: true,
    ownerEmail: input.ownerEmail,
    ownerDisplayName: input.ownerDisplayName,
    tenantName: input.tenantName,
    slug,
    packageId,
    domain: input.domain ?? null,
    settings: {},
  };
}
