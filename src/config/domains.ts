// =================================================================
// MEDISYNC — Domain Configuration
// 🔒 Architecture Constitution v1.0
//
// Centralized domain configuration for hostname resolution.
// Future: support for medisync.app, medisync.cloud, custom domains.
// =================================================================

/** Primary platform root domain */
export const ROOT_DOMAIN = "medisync.id";

/** All recognized root domains (for multi-domain future) */
export const ROOT_DOMAINS: readonly string[] = [ROOT_DOMAIN];

/** Development hostnames that resolve as root */
export const DEV_HOSTNAMES: readonly string[] = ["localhost", "127.0.0.1"];

/** Check if a hostname is a root domain (platform, not tenant) */
export function isRootHostname(hostname: string): boolean {
  return ROOT_DOMAINS.includes(hostname) || DEV_HOSTNAMES.includes(hostname);
}
