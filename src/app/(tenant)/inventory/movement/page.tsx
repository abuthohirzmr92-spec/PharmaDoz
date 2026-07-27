"use client";

import { useInventoryBranch } from "../use-inventory-branch";
import { InventoryMovementTable } from "@/components/inventory/inventory-movement-table";

export default function MovementPage() {
  useInventoryBranch();
  return <div className="overflow-y-auto h-full"><InventoryMovementTable /></div>;
}
