"use client";

import { useInventoryBranch } from "../use-inventory-branch";
import { InventorySupplierTable } from "@/components/inventory/inventory-supplier-table";

export default function SuppliersPage() {
  useInventoryBranch();
  return <div className="overflow-y-auto h-full"><InventorySupplierTable /></div>;
}
