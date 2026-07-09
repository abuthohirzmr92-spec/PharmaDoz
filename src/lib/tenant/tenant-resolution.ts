// =================================================================
// MEDISYNC — Tenant Resolution Service (Branding Sprint 1.1)
// 🔒 Architecture Constitution v1.0
//
// Responsibility: Resolve tenant identity from hostname.
// Hostname → slug → tenant lookup.
//
// Generic tenant resolution. NOT branding-specific.
// Reused by: Branding, Customer Portal, Clinic, Laboratory, Mobile.
// =================================================================

import { ROOT_DOMAIN, isRootHostname } from "@/config/domains";
import { SLUG_PATTERN } from "@/lib/validators/patterns";

// ─── Types ───

/** Identity resolved from a hostname request. */
export interface TenantIdentity {
  /** Tenant database ID */
  tenantId: string;
  /** Canonical slug */
  slug: string;
  /** Original hostname from the request */
  hostname: string;
  /** Whether this is the root domain (medisync.id) */
  isRootDomain: boolean;
  /** Resolution source for audit trail */
  source: "subdomain" | "root" | "unknown";
}

/** Result of tenant resolution. */
export interface TenantResolutionResult {
  resolved: boolean;
  identity?: TenantIdentity;
  error?: string;
}

// ─── Resolution ───

/**
 * Parse hostname and resolve tenant identity.
 *
 * @param hostname — Request hostname (e.g., "apotek-sehat.medisync.id")
 * @returns TenantResolutionResult with identity if subdomain matched
 */
export function resolveTenantFromHostname(hostname: string): TenantResolutionResult {
  // Strip port
  const host = hostname.split(":")[0] ?? hostname;

  // Root domain or localhost
  if (isRootHostname(host)) {
    return {
      resolved: false,
      identity: {
        tenantId: "",
        slug: "medisync",
        hostname: host,
        isRootDomain: true,
        source: "root",
      },
    };
  }

  // Check if subdomain of medisync.id
  const rootSuffix = `.${ROOT_DOMAIN}`;
  if (host.endsWith(rootSuffix)) {
    const rawSlug = host.slice(0, -rootSuffix.length);

    // Reject uppercase — slugs must be lowercase
    if (rawSlug !== rawSlug.toLowerCase()) {
      return { resolved: false, error: "Slug must be lowercase." };
    }

    const slug = rawSlug.toLowerCase();

    if (!SLUG_PATTERN.test(slug)) {
      return { resolved: false, error: `Invalid slug format: ${slug}` };
    }

    return {
      resolved: true,
      identity: {
        tenantId: "", // Filled by DB lookup (Sprint 2 repository integration)
        slug,
        hostname: host,
        isRootDomain: false,
        source: "subdomain",
      },
    };
  }

  // Unknown domain
  return {
    resolved: false,
    identity: {
      tenantId: "",
      slug: "unknown",
      hostname: host,
      isRootDomain: false,
      source: "unknown",
    },
    error: `Unknown domain: ${host}`,
  };
}
