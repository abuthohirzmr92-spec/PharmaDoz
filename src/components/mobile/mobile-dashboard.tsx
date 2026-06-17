"use client";

import Link from "next/link";
import { TrendingUp, ShoppingCart, Package, Truck, ClipboardList, Users, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import { MobileHeader } from "./mobile-header";
import { useTransactionStore } from "@/store/transaction-store";

function formatRupiah(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}K`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function MobileDashboard() {
  const todaySales = useTransactionStore((s) => s.getTodaySalesTotal());
  const todayTxns = useTransactionStore((s) => s.getTodayTransactionCount());

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0F172A]">
      <MobileHeader />

      {/* ─── HERO CARD ─── */}
      <div className="relative -mt-12 px-4">
        <div
          className="rounded-3xl p-5 text-white shadow-xl"
          style={{
            background: "linear-gradient(135deg, #12D6B5 0%, #1E88E5 100%)",
            boxShadow: "0 16px 40px rgba(30,136,229,0.25)",
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
        </div>
      </div>

      {/* ─── QUICK MENU ─── */}
      <div className="mt-6 px-4">
        <div className="grid grid-cols-3 gap-3">
          {([
            { href: "/cashier", label: "Kasir", icon: ShoppingCart },
            { href: "/products", label: "Produk", icon: Package },
            { href: "/inventory", label: "Pembelian", icon: Truck },
            { href: "/inventory?tab=opname", label: "Stok Opname", icon: ClipboardList },
            { href: "/inventory?tab=purchase", label: "Supplier", icon: Users },
            { href: "/reports", label: "Laporan", icon: FileText },
          ]).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm transition active:scale-95 dark:bg-[#1E293B]"
                style={{ minHeight: "88px" }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#12D6B5] to-[#1E88E5]">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
