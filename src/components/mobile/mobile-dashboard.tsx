"use client";

import Link from "next/link";
import { TrendingUp, Package, Truck, ClipboardList, Users, FileText } from "lucide-react";
import { MobileHeader } from "./mobile-header";
import { useTransactionStore } from "@/store/transaction-store";
import { shadowTokens } from "@/theme/tokens";
import { getGradient } from "@/components/ui/app-gradient";
import { AppCard } from "@/components/ui/app-card";
import { AppIcon } from "@/components/ui/app-icon";
import { AppSection } from "@/components/ui/app-section";

function formatRupiah(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}K`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function MobileDashboard() {
  const todaySales = useTransactionStore((s) => s.getTodaySalesTotal());
  const todayTxns = useTransactionStore((s) => s.getTodayTransactionCount());

  return (
    <div className="flex-1 bg-[#F7F9FC] dark:bg-[#0F172A] pb-6">
      <MobileHeader />

      {/* ─── HERO CARD ─── */}
      <div className="relative -mt-12 px-4">
        <AppCard
          variant="hero"
          style={{
            background: getGradient("primary"),
            boxShadow: shadowTokens.hero,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/70">Penjualan Hari Ini</p>
              <p className="mt-1 text-[28px] font-bold tracking-tight">
                {formatRupiah(todaySales)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/20 px-3 py-1.5 text-center backdrop-blur">
              <p className="text-xl font-bold">{todayTxns}</p>
              <p className="text-[10px] text-white/70">Transaksi</p>
            </div>
          </div>
        </AppCard>
      </div>

      {/* ─── QUICK MENU ─── */}
      <AppSection spacing="lg">
        <div className="grid grid-cols-3 gap-3">
          {([
            { href: "/products", label: "Produk", icon: Package },
            { href: "/inventory", label: "Pembelian", icon: Truck },
            { href: "/inventory?tab=opname", label: "Stok Opname", icon: ClipboardList },
            { href: "/inventory?tab=purchase", label: "Supplier", icon: Users },
            { href: "/reports", label: "Laporan", icon: FileText },
          ]).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 transition active:scale-95"
              style={{ minHeight: "88px" }}
            >
              <AppCard className="flex flex-col items-center p-4">
                <AppIcon icon={item.icon} size="md" />
                <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 text-center leading-tight">
                  {item.label}
                </span>
              </AppCard>
            </Link>
          ))}
        </div>
      </AppSection>
    </div>
  );
}
