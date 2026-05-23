import dynamic from "next/dynamic";
import { Container } from "@/components/shared/container";
import { TableSkeleton } from "@/components/shared/table-skeleton";

const ProductsPageContent = dynamic(
  () => import("@/components/products/products-page-content").then((m) => m.ProductsPageContent),
  {
    loading: () => (
      <Container>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Produk
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manajemen obat, alat kesehatan, dan suplemen
          </p>
        </div>
        <TableSkeleton rows={6} />
      </Container>
    ),
  },
);

export default function ProductsPage() {
  return <ProductsPageContent />;
}
