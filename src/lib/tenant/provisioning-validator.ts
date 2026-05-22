import { createServerSupabase } from "@/lib/supabase/server";
import { generateSlug } from "./onboarding";
import type { ProvisioningInput, ProvisioningError } from "@/types";

const PACKAGE_UUIDS = {
  basic: "00000000-0000-0000-0000-000000000101",
  professional: "00000000-0000-0000-0000-000000000102",
  enterprise: "00000000-0000-0000-0000-000000000103",
} as const;

type PackageSlug = keyof typeof PACKAGE_UUIDS;
const VALID_PACKAGES: string[] = Object.keys(PACKAGE_UUIDS);
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

  const pkg = input.packageSlug ?? "basic";
  if (!VALID_PACKAGES.includes(pkg)) {
    errors.push({
      code: "VALIDATION_ERROR",
      message: `Paket tidak valid: ${pkg}. Pilih: ${VALID_PACKAGES.join(", ")}.`,
      field: "packageSlug",
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
 * Full validation incl. slug availability check against Supabase.
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

  const pkg = (input.packageSlug ?? "basic") as PackageSlug;
  const packageId = PACKAGE_UUIDS[pkg] ?? PACKAGE_UUIDS.basic;

  // Slug availability check (best-effort — final validation is in the DB function)
  try {
    const supabase = await createServerSupabase();
    const { count, error } = await supabase
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
          message: `Slug "${slug}" sudah digunakan. Coba nama apotek lain.`,
          field: "slug",
          retryable: true,
          suggestion: `${slug}-${Date.now().toString(36)}`,
        }],
      };
    }
  } catch {
    // Network error — let the DB function catch any issues
  }

  return {
    valid: true,
    ownerEmail: input.ownerEmail.trim().toLowerCase(),
    ownerDisplayName: input.ownerDisplayName.trim(),
    tenantName: input.tenantName.trim(),
    slug,
    packageId,
    domain: input.domain?.trim() || null,
    settings: input.settings ?? {},
  };
}
