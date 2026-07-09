// =================================================================
// MEDISYNC — Reserved Slugs Configuration
// 🔒 Architecture Constitution v1.0
//
// Single source of truth for reserved slugs across ALL modules:
//   - Branding (tenant subdomains)
//   - Customer Portal
//   - API Gateway
//   - Admin
//   - Future modules (Clinic, Laboratory, Mobile)
//
// DO NOT duplicate this list. Import from here.
// =================================================================

export const RESERVED_SLUGS: readonly string[] = [
  "admin",
  "administrator",
  "api",
  "app",
  "apps",
  "auth",
  "billing",
  "blog",
  "cdn",
  "dashboard",
  "dev",
  "docs",
  "help",
  "login",
  "logout",
  "mail",
  "medisync",
  "monitor",
  "portal",
  "register",
  "root",
  "signup",
  "smtp",
  "staging",
  "status",
  "support",
  "system",
  "test",
  "testing",
  "www",
] as const;

/** O(1) lookup set built from the canonical array */
export const RESERVED_SLUGS_SET: ReadonlySet<string> = new Set(RESERVED_SLUGS);
