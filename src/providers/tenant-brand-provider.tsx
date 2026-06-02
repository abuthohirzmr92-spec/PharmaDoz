"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import type { TenantBranding } from "@/types";
import { useTenant } from "@/hooks/use-tenant";
import { isDemoMode as checkDemoMode } from "@/config/env";

interface TenantBrandContextValue {
  branding: TenantBranding;
  isLoading: boolean;
}

const TenantBrandCtx = createContext<TenantBrandContextValue>({
  branding: {},
  isLoading: false,
});

export function useTenantBranding(): TenantBrandContextValue {
  return useContext(TenantBrandCtx);
}

/** CSS variables applied to :root based on tenant branding */
const CSS_VAR_MAP: Record<keyof TenantBranding, string> = {
  primaryColor: "--brand-primary",
  secondaryColor: "--brand-secondary",
  themeMode: "--brand-theme-mode",
  logoUrl: "",
  customDomain: "",
  faviconUrl: "",
  companyName: "",
  receiptFooter: "",
  address: "",
  phone: "",
};

function applyBrandingCss(branding: TenantBranding) {
  const root = document.documentElement;

  if (branding.primaryColor) {
    root.style.setProperty("--brand-primary", branding.primaryColor);
    root.style.setProperty("--brand-600", branding.primaryColor);
    root.style.setProperty("--brand-700", adjustColor(branding.primaryColor, -10));
  } else {
    root.style.removeProperty("--brand-primary");
    root.style.removeProperty("--brand-600");
    root.style.removeProperty("--brand-700");
  }

  if (branding.secondaryColor) {
    root.style.setProperty("--brand-secondary", branding.secondaryColor);
  } else {
    root.style.removeProperty("--brand-secondary");
  }
}

function clearBrandingCss() {
  const root = document.documentElement;
  root.style.removeProperty("--brand-primary");
  root.style.removeProperty("--brand-600");
  root.style.removeProperty("--brand-700");
  root.style.removeProperty("--brand-secondary");
}

/** Darken a hex color by a given percentage */
function adjustColor(hex: string, percent: number): string {
  try {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + percent));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + percent));
    const b = Math.max(0, Math.min(255, (num & 0x0000ff) + percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch {
    return hex;
  }
}

/** Extract branding from tenant settings JSONB */
function extractBranding(tenant: any): TenantBranding {
  const s = tenant?.settings ?? {};
  return {
    logoUrl: s.logo_url ?? null,
    primaryColor: s.primary_color ?? null,
    secondaryColor: s.secondary_color ?? null,
    themeMode: s.theme_mode ?? "system",
    customDomain: s.domain ?? null,
    faviconUrl: s.favicon_url ?? null,
    companyName: s.company_name ?? null,
    receiptFooter: s.receipt_footer ?? null,
    address: s.address ?? null,
    phone: s.phone ?? null,
  };
}

export function TenantBrandProvider({ children }: { children: React.ReactNode }) {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const isDemo = checkDemoMode();

  const branding = useMemo<TenantBranding>(() => {
    if (isDemo || !tenant) return {};
    return extractBranding(tenant);
  }, [isDemo, tenant]);

  useEffect(() => {
    if (branding.primaryColor || branding.secondaryColor) {
      applyBrandingCss(branding);
    } else {
      clearBrandingCss();
    }
    return () => clearBrandingCss();
  }, [branding.primaryColor, branding.secondaryColor]);

  const value = useMemo<TenantBrandContextValue>(
    () => ({ branding, isLoading: tenantLoading }),
    [branding, tenantLoading],
  );

  return (
    <TenantBrandCtx.Provider value={value}>
      {children}
    </TenantBrandCtx.Provider>
  );
}
