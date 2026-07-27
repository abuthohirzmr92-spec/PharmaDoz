"use client";

import { usePathname } from "next/navigation";

function sectionTitle(pathname: string): string {
  if (pathname.startsWith("/settings/config")) return "Konfigurasi Apotek";
  if (pathname.startsWith("/settings/users")) return "Pengguna";
  if (pathname.startsWith("/settings/integration")) return "Integrasi";
  if (pathname.startsWith("/settings/subscription")) return "Langganan";
  if (pathname.startsWith("/settings/account")) return "Akun Saya";
  return "Settings";
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <p className="text-sm font-medium text-neutral-400">Settings</p>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        {sectionTitle(pathname)}
      </h1>
      <div>{children}</div>
    </div>
  );
}
