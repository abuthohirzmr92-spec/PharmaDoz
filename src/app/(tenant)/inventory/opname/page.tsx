"use client";

import { useInventoryBranch } from "../use-inventory-branch";
import { InventoryOpnamePanel } from "@/components/inventory/inventory-opname-panel";

export default function OpnamePage() {
  useInventoryBranch();
  return <div className="overflow-y-auto h-full"><InventoryOpnamePanel /></div>;
}
