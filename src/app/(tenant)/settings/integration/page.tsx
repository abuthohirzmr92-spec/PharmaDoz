"use client";

import { MessageCircle, CreditCard, HeartPulse, ShoppingBag, Webhook } from "lucide-react";
import { AppBadge } from "@/components/ui/app-badge";

type Connector = {
  key: string;
  name: string;
  description: string;
  icon: typeof MessageCircle;
  accent: string;
};

const CONNECTORS: Connector[] = [
  { key: "whatsapp",    name: "WhatsApp Gateway", description: "Kirim notifikasi transaksi & pengingat stok via WhatsApp.", icon: MessageCircle, accent: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400" },
  { key: "xendit",      name: "Xendit",           description: "Terima pembayaran digital (QRIS, VA, e-wallet, kartu).",     icon: CreditCard,   accent: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
  { key: "bpjs",        name: "BPJS",             description: "Verifikasi peserta & klaim layanan kefarmasian BPJS.",       icon: HeartPulse,   accent: "bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400" },
  { key: "marketplace", name: "Marketplace",      description: "Sinkronkan katalog & stok ke marketplace apotek online.",    icon: ShoppingBag,  accent: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400" },
  { key: "api",         name: "Developer API",    description: "Webhook & REST API untuk integrasi sistem pihak ketiga.",    icon: Webhook,      accent: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400" },
];

export default function IntegrationPage() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Integrasi</h2>
        <p className="text-xs text-neutral-500">Hubungkan apotek Anda dengan layanan eksternal</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CONNECTORS.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.key}
              aria-disabled="true"
              className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5 opacity-70 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{c.name}</h3>
                  <AppBadge variant="warning">Coming Soon</AppBadge>
                </div>
                <p className="mt-1 text-xs text-neutral-500">{c.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
