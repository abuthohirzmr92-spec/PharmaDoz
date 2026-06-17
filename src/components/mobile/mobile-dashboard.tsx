"use client";

import { TrendingUp } from "lucide-react";
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
          <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
            <TrendingUp className="h-3 w-3 text-[#10B981]" />
            <span className="text-[#10B981] font-medium">+12%</span>
            <span>dari kemarin</span>
          </div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <p style={{ fontWeight: "bold" }}>HERO CARD ONLY</p>
      </div>
    </div>
  );
}
