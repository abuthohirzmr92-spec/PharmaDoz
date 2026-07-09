// =================================================================
// MEDISYNC — Tenant Repository Contract (Branding Sprint 1.1)
// 🔒 Architecture Constitution v1.0
//
// Responsibility: Define the tenant data access contract.
// Domain defines this interface. Infrastructure implements it.
//
// Future implementations:
//   - SupabaseTenantRepository   (production)
//   - MemoryTenantRepository     (tests)
//   - MockTenantRepository       (unit tests)
// =================================================================

import type { TenantIdentity } from "./tenant-resolution";

/** Result of a slug lookup operation. */
export interface SlugLookupResult {
  found: boolean;
  tenantId?: string;
  slug?: string;
}

/**
 * Contract for tenant data access.
 *
 * All tenant-related data access MUST go through this interface.
 * No direct DB queries from components or services.
 */
export interface TenantRepository {
  /** Find a tenant by their canonical slug. */
  findBySlug(slug: string): Promise<SlugLookupResult>;

  /** Check whether a slug is already in use by any tenant. */
  existsSlug(slug: string): Promise<boolean>;

  /** Resolve a full TenantIdentity from a hostname. */
  resolveIdentity(hostname: string): Promise<TenantIdentity | null>;
}
