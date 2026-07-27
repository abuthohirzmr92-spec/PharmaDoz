"use client";

import { usePathname } from "next/navigation";

function sectionTitle(pathname: string): string {
  if (pathname.startsWith("/inventory/stock")) return "Stok & Batch";
  if (pathname.startsWith("/inventory/suppliers")) return "Supplier";
  if (pathname.startsWith("/inventory/purchase")) return "Pembelian";
  if (pathname.startsWith("/inventory/movement")) return "Mutasi";
  if (pathname.startsWith("/inventory/expired")) return "Kadaluarsa";
  if (pathname.startsWith("/inventory/opname")) return "Stock Opname";
  return "Inventory";
}

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <p className="text-sm font-medium text-neutral-400">Inventory</p>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        {sectionTitle(pathname)}
      </h1>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
