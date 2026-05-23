import dynamic from "next/dynamic";
import { Container } from "@/components/shared/container";

const InventoryPageContent = dynamic(
  () => import("@/components/inventory/inventory-page-content").then((m) => m.InventoryPageContent),
  {
    loading: () => (
      <Container>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Kelola stok, batch FEFO, pembelian, mutasi, monitoring kadaluarsa, dan stock opname.
          </p>
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
      </Container>
    ),
  },
);

export default function InventoryPage() {
  return <InventoryPageContent />;
}
