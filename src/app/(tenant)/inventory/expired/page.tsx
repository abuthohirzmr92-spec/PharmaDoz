"use client";

import { useInventoryBranch } from "../use-inventory-branch";
import { InventoryExpiredTable } from "@/components/inventory/inventory-expired-table";

export default function ExpiredPage() {
  useInventoryBranch();
  return <div className="overflow-y-auto h-full"><InventoryExpiredTable /></div>;
}
