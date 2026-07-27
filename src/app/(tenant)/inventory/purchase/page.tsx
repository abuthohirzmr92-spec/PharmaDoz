"use client";

import { useInventoryBranch } from "../use-inventory-branch";
import { InventoryPurchasePanel } from "@/components/inventory/inventory-purchase-panel";
import { InventorySupplierTable } from "@/components/inventory/inventory-supplier-table";

export default function PurchasePage() {
  useInventoryBranch();
  return (
    <div className="overflow-y-auto space-y-6 h-full">
      <InventoryPurchasePanel />
      <InventorySupplierTable />
    </div>
  );
}
