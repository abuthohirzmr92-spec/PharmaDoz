"use client";

import { Bell } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useTenantBranding } from "@/providers/tenant-brand-provider";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 19) return "Selamat Sore";
  return "Selamat Malam";
}

function getEmoji(): string {
  const h = new Date().getHours();
  if (h < 11) return "☀️";
  if (h < 15) return "🌤️";
  if (h < 19) return "🌅";
  return "🌙";
}

export function MobileHeader() {
  const user = useAuthStore((s) => s.user);
  const { branding } = useTenantBranding();
  const pharmacyName = branding?.companyName ?? user?.pharmacyName ?? user?.tenantName ?? "Apotek";

  return (
    <div
      className="relative overflow-hidden px-5 pt-6"
      style={{
        background: "linear-gradient(135deg, #12D6B5 0%, #1E88E5 100%)",
        borderRadius: "0 0 40px 40px",
        paddingBottom: "80px",
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute top-10 right-12 h-12 w-12 rounded-full bg-white/10" />

      {/* Top row */}
      <div className="relative flex items-center justify-between">
        <div className="text-white">
          <p className="text-sm font-medium text-white/80">
            {getGreeting()} {getEmoji()}
          </p>
          <h1 className="mt-0.5 text-lg font-bold tracking-tight">
            {pharmacyName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative rounded-full bg-white/20 p-2.5 transition active:scale-95">
            <Bell className="h-5 w-5 text-white" />
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-bold text-white ring-2 ring-white/30">
              3
            </span>
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white ring-2 ring-white/30 transition active:scale-95">
            {user?.displayName?.charAt(0)?.toUpperCase() ?? "A"}
          </button>
        </div>
      </div>
    </div>
  );
}
