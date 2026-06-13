"use client";

import { Container } from "@/components/shared/container";
import { useTenantBranding } from "@/providers/tenant-brand-provider";
import { Globe, Store, ShoppingCart, MessageCircle, Clock } from "lucide-react";

export default function PortalPage() {
  const { branding } = useTenantBranding();
  const tenantName = branding?.companyName ?? "Apotek";

  const features = [
    { icon: Store, label: "Profil Apotek", desc: "Informasi lengkap apotek Anda" },
    { icon: Globe, label: "Katalog Produk", desc: "Daftar produk dengan harga dan stok" },
    { icon: ShoppingCart, label: "Pemesanan Online", desc: "Pelanggan dapat memesan langsung" },
    { icon: MessageCircle, label: "WhatsApp Order", desc: "Terima pesanan via WhatsApp" },
    { icon: Clock, label: "Riwayat Pesanan", desc: "Lacak semua pesanan masuk" },
  ];

  return (
    <Container>
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={tenantName} className="h-12 w-12 object-contain" />
          ) : (
            <Globe className="h-10 w-10 text-brand-500" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Portal Online — {tenantName}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Fitur portal online sedang dalam pengembangan.
          <br />
          Segera hadir untuk membantu apotek Anda melayani pelanggan secara digital.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.label}
              className="rounded-xl border border-neutral-200 bg-white p-4 text-left dark:border-neutral-800 dark:bg-neutral-950">
              <f.icon className="mb-2 h-5 w-5 text-brand-500" />
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{f.label}</h3>
              <p className="mt-0.5 text-xs text-neutral-400">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">🚀 Coming Soon</p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Fitur ini akan tersedia dalam update mendatang.
          </p>
        </div>
      </div>
    </Container>
  );
}
