/* ------------------------------------------------------------------ */
/*  Tenant Branding Service — centralized branding access              */
/* ------------------------------------------------------------------ */
/*  All UI should read tenant branding through this service.           */
/*  Source of truth: tenants.settings (JSONB).                         */
/* ------------------------------------------------------------------ */

import type { TenantBranding } from "@/types";

/** Extract branding from a tenant record (raw DB row or store object) */
export function extractTenantBranding(tenant: { settings?: Record<string, unknown> | null; name?: string | null } | null | undefined): TenantBranding {
  if (!tenant) return {};
  const s = tenant.settings ?? {};
  return {
    companyName: (s.company_name as string) ?? tenant.name ?? null,
    logoUrl: (s.logo_url as string) ?? null,
    address: (s.address as string) ?? null,
    phone: (s.phone as string) ?? null,
    receiptFooter: (s.receipt_footer as string) ?? null,
    primaryColor: (s.primary_color as string) ?? null,
    secondaryColor: (s.secondary_color as string) ?? null,
    themeMode: ((s.theme_mode as string) ?? "system") as "light" | "dark" | "system",
    customDomain: (s.domain as string) ?? null,
    faviconUrl: (s.favicon_url as string) ?? null,
  };
}

/** Get tenant display name — branding companyName → tenant name → fallback */
export function getTenantDisplayName(branding: TenantBranding, fallback = "Apotek"): string {
  return branding.companyName ?? fallback;
}

/** Get tenant logo URL or null */
export function getTenantLogo(branding: TenantBranding): string | null {
  return branding.logoUrl ?? null;
}

/** Get receipt footer or default */
export function getReceiptFooter(branding: TenantBranding): string {
  return branding.receiptFooter ?? "Terima kasih telah berbelanja.";
}
