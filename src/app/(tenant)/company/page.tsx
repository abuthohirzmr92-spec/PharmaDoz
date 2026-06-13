"use client";

import { Container } from "@/components/shared/container";
import { useTenantBranding } from "@/providers/tenant-brand-provider";
import { MapPin, Phone, Globe, Building } from "lucide-react";

export default function CompanyPage() {
  const { branding } = useTenantBranding();
  const tenantName = branding?.companyName ?? "Apotek";

  return (
    <Container>
      <div className="mx-auto max-w-2xl py-12">
        {/* Hero */}
        <div className="text-center">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={tenantName}
              className="mx-auto h-20 w-20 rounded-xl object-contain" />
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
              <Building className="h-10 w-10 text-brand-500" />
            </div>
          )}
          <h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {tenantName}
          </h1>
        </div>

        {/* Info */}
        <div className="mt-8 space-y-3 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
          {branding?.address && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">{branding.address}</span>
            </div>
          )}
          {branding?.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">{branding.phone}</span>
            </div>
          )}
        </div>

        {/* Coming Soon */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <Globe className="mx-auto mb-2 h-5 w-5 text-amber-500" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Halaman Profil — Coming Soon</p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Halaman publik ini akan menjadi etalase online apotek Anda.
          </p>
        </div>
      </div>
    </Container>
  );
}
