"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ShoppingCart, Package, Truck, ClipboardList,
  Users, FileText, TrendingUp, ArrowUp, Search,
  Barcode, Circle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { MobileHeader } from "./mobile-header";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useWalletStore } from "@/store/wallet-store";

function formatRupiah(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}K`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const QUICK_MENU = [
  { href: "/cashier", label: "Kasir", icon: ShoppingCart, gradient: "from-[#12D6B5] to-[#18B7C8]" },
  { href: "/products", label: "Produk", icon: Package, gradient: "from-[#1E88E5] to-[#1557D5]" },
  { href: "/inventory", label: "Pembelian", icon: Truck, gradient: "from-[#18B7C8] to-[#1E88E5]" },
  { href: "/inventory?tab=opname", label: "Stok Opname", icon: ClipboardList, gradient: "from-[#12D6B5] to-[#1E88E5]" },
  { href: "/inventory?tab=purchase", label: "Supplier", icon: Users, gradient: "from-[#1557D5] to-[#1E88E5]" },
  { href: "/reports", label: "Laporan", icon: FileText, gradient: "from-[#18B7C8] to-[#1557D5]" },
];

export function MobileDashboard() {
  const todaySales = useTransactionStore((s) => s.getTodaySalesTotal());
  const todayTxns = useTransactionStore((s) => s.getTodayTransactionCount());
  const batches = useInventoryStore((s) => s.batches);
  const wallets = useWalletStore((s) => s.wallets);

  const lowStock = useMemo(
    () => batches.filter((b) => b.quantity > 0 && b.quantity <= 10).length,
    [batches],
  );

  const recentTxns = useTransactionStore((s) =>
    s.transactions.slice(0, 5),
  );

  const totalBalance = wallets
    .filter((w) => !w.isArchived && w.isActive)
    .reduce((s, w) => s + (w.balance || 0), 0);

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
          <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
            <TrendingUp className="h-3 w-3 text-[#10B981]" />
            <span className="text-[#10B981] font-medium">+12%</span>
            <span>dari kemarin</span>
          </div>
        </div>
      </div>

      {/* ─── QUICK MENU ─── */}
      <div className="mt-6 px-4">
        <div className="grid grid-cols-3 gap-3">
          {QUICK_MENU.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm transition active:scale-95 dark:bg-[#1E293B]"
                style={{
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  minHeight: "88px",
                }}
              >
                <div
                  className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br")}
                  style={{
                    backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                  }}
                >
                  <Icon className="h-5 w-5 text-white" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }} />
                </div>
                <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── STATUS CARDS (horizontal scroll) ─── */}
      <div className="mt-5 px-4">
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {[
            { label: "Stok Menipis", value: `${lowStock} Item`, icon: "⚠️", color: "#F59E0B", bg: "#FEF3C7" },
            { label: "Kadaluarsa 30H", value: "2 Item", icon: "🔴", color: "#EF4444", bg: "#FEE2E2" },
            { label: "Pending Order", value: "3", icon: "📦", color: "#3B82F6", bg: "#DBEAFE" },
            { label: "Pelanggan", value: "48", icon: "👥", color: "#10B981", bg: "#D1FAE5" },
          ].map((card) => (
            <div
              key={card.label}
              className="shrink-0 rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1E293B]"
              style={{
                width: "136px",
                height: "96px",
                borderLeft: `3px solid ${card.color}`,
              }}
            >
              <p className="text-lg">{card.icon}</p>
              <p className="mt-1 text-lg font-bold text-neutral-800 dark:text-white">{card.value}</p>
              <p className="text-[10px] text-neutral-400">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <div className="mt-4 px-4">
        <div
          className="flex items-center gap-3 bg-white px-5 shadow-sm dark:bg-[#1E293B]"
          style={{
            height: "56px",
            borderRadius: "999px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <Search className="h-5 w-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari obat atau produk..."
            className="flex-1 bg-transparent text-sm text-neutral-800 placeholder-neutral-400 outline-none dark:text-white"
          />
          <button className="rounded-full bg-gradient-to-br from-[#12D6B5] to-[#1E88E5] p-2.5 transition active:scale-95">
            <Barcode className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* ─── RECENT TRANSACTIONS ─── */}
      <div className="mt-5 px-4 pb-36">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-neutral-800 dark:text-white">Transaksi Terbaru</h3>
          <Link href="/reports" className="text-xs font-medium text-[#1E88E5]">Lihat Semua</Link>
        </div>

        {recentTxns.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center dark:bg-[#1E293B]">
            <ShoppingCart className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 text-sm text-neutral-400">Belum ada transaksi hari ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTxns.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition active:scale-[0.99] dark:bg-[#1E293B]"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#10B981]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">
                    {txn.items?.[0]?.productName ?? txn.invoiceNumber ?? "Transaksi"}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {new Date(txn.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-800 dark:text-white">
                    {formatRupiah(txn.total)}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-medium text-[#10B981]">
                    <Circle className="h-1.5 w-1.5 fill-current" />
                    Lunas
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
