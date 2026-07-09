// =================================================================
// MEDISYNC — Shared Validation Patterns
// 🔒 Architecture Constitution v1.0
//
// Single source of truth for regex validation patterns.
// Services consume these instead of embedding duplicate regex.
//
// NEVER duplicate a regex pattern. Import from here.
// =================================================================

/** Tenant slug: lowercase alphanumeric + hyphens, 3-30 chars */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Email address (RFC 5322 simplified) */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Hostname (DNS label, no protocol) */
export const HOSTNAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)+$/;

/** Phone number (Indonesian format, 10-13 digits) */
export const PHONE_PATTERN = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;

/** Barcode (EAN-13 / UPC-A, 12-13 digits) */
export const BARCODE_PATTERN = /^\d{12,13}$/;
