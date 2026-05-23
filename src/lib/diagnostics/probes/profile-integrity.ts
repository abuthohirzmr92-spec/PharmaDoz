/** Profile integrity probe — validates profile data after fetch.
 *
 * Detects:
 * - Unaffiliated role with tenant_id (broken tenant_users lookup)
 * - Inactive profile for authenticated user
 * - Missing tenant affiliation (no tenantId and no pharmacyId) */

import { diagnosticRepo } from "../repository";
import { isDiagnosticsEnabled } from "../config";

interface ProfileCheckInput {
  id?: string;
  role?: string | null;
  tenantId?: string | null;
  pharmacyId?: string | null;
  isActive?: boolean;
}

export function checkProfileIntegrity(profile: ProfileCheckInput): void {
  if (!isDiagnosticsEnabled()) return;

  // Pattern 1: unaffiliated but has tenant_id — broken tenant_users lookup
  if (
    profile.role === "unaffiliated" &&
    (profile.tenantId || profile.pharmacyId)
  ) {
    diagnosticRepo.report({
      patternId: "unaffiliated-profile",
      severity: "error",
      message:
        "Profile role is 'unaffiliated' but user has tenant affiliation. " +
        "The tenant_users role lookup is failing (missing row, is_active=false, or RLS blocking).",
      timestamp: new Date().toISOString(),
      remediation:
        "Check tenant_users table for this user. Verify the row exists, is_active is true, " +
        "and RLS policy allows the auth.uid() to read it.",
    });
  }

  // Pattern 2: inactive profile
  if (profile.isActive === false) {
    diagnosticRepo.report({
      patternId: "inactive-profile",
      severity: "warn",
      message: `User ${profile.id ?? "unknown"} has is_active=false but is authenticated.`,
      timestamp: new Date().toISOString(),
      remediation:
        "The user's profile is marked inactive but Supabase Auth still has a valid session. " +
        "Consider signing them out or re-activating the profile.",
    });
  }

  // Pattern 3: no tenant affiliation at all (business user scenario)
  if (!profile.tenantId && !profile.pharmacyId && profile.role !== "super_admin") {
    diagnosticRepo.report({
      patternId: "no-tenant-affiliation",
      severity: "warn",
      message:
        "Authenticated user has no tenant_id or pharmacy_id — role is " +
        (profile.role ?? "null") + ". Unable to scope to a tenant.",
      timestamp: new Date().toISOString(),
      remediation:
        "This user was provisioned without a tenant. Run provision_tenant or manually assign a tenant_id in the profiles table.",
    });
  }
}
