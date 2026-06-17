"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, FileText, User } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/products", label: "Produk", icon: Package },
  { href: "/cashier", label: "Kasir", icon: ShoppingCart, isFab: true },
  { href: "/reports", label: "Laporan", icon: FileText },
  { href: "/settings/account", label: "Akun", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl border-t border-neutral-100 dark:bg-[#0F172A]/95 dark:border-[#1E293B]"
      style={{
        borderRadius: "32px 32px 0 0",
        boxShadow: "0 -5px 20px rgba(0,0,0,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
      }}>
      <div className="flex items-end justify-around px-2 pt-2" style={{ height: "80px" }}>
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.isFab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-0.5 -mt-6"
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
                    active ? "scale-110" : "scale-100",
                  )}
                  style={{
                    width: "64px",
                    height: "64px",
                    background: "linear-gradient(135deg, #12D6B5 0%, #1E88E5 100%)",
                    boxShadow: "0 12px 28px rgba(30,136,229,0.35)",
                  }}
                >
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <span className="text-[10px] font-semibold text-neutral-400 mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-1 px-3"
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-[#1E88E5]" : "text-neutral-400",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  active ? "text-[#1E88E5]" : "text-neutral-400",
                )}
              >
                {item.label}
              </span>
              {active && (
                <div
                  className="absolute top-0 h-0.5 rounded-full"
                  style={{
                    width: "24px",
                    background: "linear-gradient(90deg, #12D6B5, #1E88E5)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
