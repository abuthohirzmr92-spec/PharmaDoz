"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Clipboard,
} from "lucide-react";
import { useInventoryStore, type InventoryTab } from "@/store/inventory-store";
import { buildInventoryProducts } from "@/lib/inventory-demo";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { Container } from "@/components/shared/container";
import { useBranchStore } from "@/store/branch-store";
import { InventoryDashboardCards } from "@/components/inventory/inventory-dashboard-cards";
import { InventoryStockTable } from "@/components/inventory/inventory-stock-table";
import { InventoryPurchasePanel } from "@/components/inventory/inventory-purchase-panel";
import { InventorySupplierTable } from "@/components/inventory/inventory-supplier-table";
import { InventoryMovementTable } from "@/components/inventory/inventory-movement-table";
import { InventoryExpiredTable } from "@/components/inventory/inventory-expired-table";
import { InventoryOpnamePanel } from "@/components/inventory/inventory-opname-panel";
import { cn } from "@/lib/cn";

const TABS: { key: InventoryTab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "stock", label: "Stok", icon: Package },
  { key: "purchase", label: "Pembelian", icon: ShoppingCart },
  { key: "movement", label: "Mutasi", icon: TrendingUp },
  { key: "expired", label: "Kadaluarsa", icon: AlertTriangle },
  { key: "opname", label: "Opname", icon: Clipboard },
];

export function InventoryPageContent() {
  const activeTab = useInventoryStore((s) => s.activeTab);
  const setActiveTab = useInventoryStore((s) => s.setActiveTab);
  const searchQuery = useInventoryStore((s) => s.searchQuery);
  const loadDemoData = useInventoryStore((s) => s.loadDemoData);
  const setInventoryBranchContext = useInventoryStore((s) => s.setBranchContext);
  const activeBranch = useBranchStore((s) => s.activeBranch);
  console.log("[INVENTORY RENDER] activeBranch:", activeBranch?.id, activeBranch?.name);

  // Sync branch-store.activeBranch → inventory-store.branchId + reload data
  useEffect(() => {
    const branchId = activeBranch?.id ?? null;
    setInventoryBranchContext(branchId);
    // ── TEMP DEBUG ──
    console.log("[INVENTORY] activeBranch changed:", branchId);
    const storeState = useInventoryStore.getState();
    console.log("[INVENTORY] store batches.length:", storeState.batches.length);
    console.log("[INVENTORY] store dataSource:", storeState.dataSource);
    console.log("[INVENTORY] first 5 batches:", JSON.stringify(storeState.batches.slice(0, 5).map(b => ({
      pharmacyId: (b as any).pharmacyId,
      productName: b.productName,
      quantity: b.quantity,
    }))));
    // ── END DEBUG ──
    // Reload data when branch changes
    if (checkDemoMode()) loadDemoData();
  }, [activeBranch?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (checkDemoMode()) {
      loadDemoData();
    }
  }, [loadDemoData]);

  return (
    <Container>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Inventory
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Kelola stok, batch FEFO, pembelian, mutasi, monitoring kadaluarsa, dan stock opname.
        </p>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          let badge: number | null = null;
          if (tab.key === "expired") {
            const expired = useInventoryStore.getState().getExpiredBatches();
            const near = useInventoryStore.getState().getNearExpiryBatches(90);
            badge = expired.length + near.length;
          }

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-white text-brand-700 shadow-sm dark:bg-neutral-800 dark:text-brand-400"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {badge != null && badge > 0 && (
                <span
                  className={cn(
                    "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    isActive
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300"
                      : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <TabContent tab={activeTab} />

      {(searchQuery !== "" || activeTab === "expired" || activeTab === "stock") && (
        <div className="mt-6 flex items-center gap-4 text-[10px] text-neutral-400">
          <span>
            <kbd className="rounded border border-neutral-300 px-1 py-0.5 font-mono text-[9px] dark:border-neutral-600">
              Ctrl+F
            </kbd>{" "}
            Cari
          </span>
          <span>
            <kbd className="rounded border border-neutral-300 px-1 py-0.5 font-mono text-[9px] dark:border-neutral-600">
              Esc
            </kbd>{" "}
            Clear / close
          </span>
        </div>
      )}
    </Container>
  );
}

// TODO: pass branchId to sub-components when schema supports pharmacy_id on batches
function TabContent({ tab }: { tab: InventoryTab }) {
  switch (tab) {
    case "dashboard":
      return (
        <div className="space-y-6">
          <InventoryDashboardCards />
          <div className="grid gap-6 lg:grid-cols-2">
            <RecentMovements />
            <LowStockAlerts />
          </div>
        </div>
      );
    case "stock":
      return <InventoryStockTable />;
    case "purchase":
      return (
        <div className="space-y-6">
          <InventoryPurchasePanel />
          <InventorySupplierTable />
        </div>
      );
    case "movement":
      return <InventoryMovementTable />;
    case "expired":
      return <InventoryExpiredTable />;
    case "opname":
      return <InventoryOpnamePanel />;
    default:
      return null;
  }
}

function RecentMovements() {
  const movements = useInventoryStore((s) => s.stockMovements);
  const recent = [...movements]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Mutasi Terbaru
        </h3>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {recent.map((m) => {
          const isNeg = m.qtyChange < 0;
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-50 truncate">
                  {m.productName}
                </p>
                <p className="text-[10px] text-neutral-400">
                  {new Date(m.timestamp).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" · "}
                  {m.referenceNumber || m.type}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  isNeg ? "text-red-600" : "text-green-600",
                )}
              >
                {isNeg ? m.qtyChange : `+${m.qtyChange}`}
              </span>
            </div>
          );
        })}
        {recent.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-neutral-400">
            Belum ada mutasi
          </p>
        )}
      </div>
    </div>
  );
}

function LowStockAlerts() {
  const batches = useInventoryStore((s) => s.batches);
  const products = useMemo(
    () => buildInventoryProducts(batches).filter((p) => p.totalStock <= p.minStock),
    [batches],
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Stok Menipis
        </h3>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-neutral-900 dark:text-neutral-50 truncate">
                {p.name}
              </p>
              <p className="text-[10px] text-neutral-400">{p.category}</p>
            </div>
            <span
              className={cn(
                "text-xs font-bold tabular-nums",
                p.totalStock === 0
                  ? "text-red-600"
                  : "text-amber-600",
              )}
            >
              {p.totalStock}
              <span className="ml-0.5 text-[10px] font-normal text-neutral-400">
                /{p.minStock}
              </span>
            </span>
          </div>
        ))}
        {products.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-green-600">
            Semua stok aman
          </p>
        )}
      </div>
    </div>
  );
}
