import type { Permission } from "@/types";

/** Every permission available to tenant roles (excludes platform-only permissions). */
export const ALL_PERMISSIONS: Permission[] = [
  "cashier.transaction.create",
  "cashier.transaction.void",
  "inventory.stock.view",
  "inventory.stock.edit",
  "products.view",
  "products.edit",
  "suppliers.view",
  "suppliers.edit",
  "purchases.create",
  "purchases.view",
  "reports.sales.view",
  "reports.inventory.view",
  "expired.view",
  "expired.edit",
  "users.view",
  "users.edit",
  "tenant.users.invite",
  "settings.view",
  "settings.edit",
  "tenant.settings.edit",
  "logs.view",
  "billing.view",
];

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: Permission[];
}

/** UI-friendly grouped display order. Group keys match sidebar/layout categories. */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "cashier",
    label: "Kasir",
    permissions: ["cashier.transaction.create", "cashier.transaction.void"],
  },
  {
    key: "inventory",
    label: "Inventori",
    permissions: ["inventory.stock.view", "inventory.stock.edit"],
  },
  {
    key: "products",
    label: "Produk",
    permissions: ["products.view", "products.edit"],
  },
  {
    key: "suppliers",
    label: "Supplier",
    permissions: ["suppliers.view", "suppliers.edit"],
  },
  {
    key: "purchases",
    label: "Pembelian",
    permissions: ["purchases.create", "purchases.view"],
  },
  {
    key: "reports",
    label: "Laporan",
    permissions: ["reports.sales.view", "reports.inventory.view"],
  },
  {
    key: "expired",
    label: "Kadaluarsa",
    permissions: ["expired.view", "expired.edit"],
  },
  {
    key: "users",
    label: "Pengguna",
    permissions: ["users.view", "users.edit", "tenant.users.invite"],
  },
  {
    key: "settings",
    label: "Pengaturan",
    permissions: ["settings.view", "settings.edit", "tenant.settings.edit"],
  },
  {
    key: "billing",
    label: "Tagihan",
    permissions: ["billing.view"],
  },
  {
    key: "logs",
    label: "Log",
    permissions: ["logs.view"],
  },
];

/** Human-readable short label for each permission (displayed in toggle rows). */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "cashier.transaction.create": "Buat Transaksi",
  "cashier.transaction.void": "Void Transaksi",
  "inventory.stock.view": "Lihat Stok",
  "inventory.stock.edit": "Edit Stok",
  "products.view": "Lihat Produk",
  "products.edit": "Edit Produk",
  "suppliers.view": "Lihat Supplier",
  "suppliers.edit": "Edit Supplier",
  "purchases.create": "Buat Pembelian",
  "purchases.view": "Lihat Pembelian",
  "reports.sales.view": "Laporan Penjualan",
  "reports.inventory.view": "Laporan Inventori",
  "expired.view": "Lihat Kadaluarsa",
  "expired.edit": "Edit Kadaluarsa",
  "users.view": "Lihat Pengguna",
  "users.edit": "Edit Pengguna",
  "tenant.users.invite": "Undang Pengguna",
  "settings.view": "Lihat Pengaturan",
  "settings.edit": "Edit Pengaturan",
  "tenant.settings.edit": "Edit Pengaturan Tenant",
  "logs.view": "Lihat Log",
  "billing.view": "Lihat Tagihan",
  "platform.view": "Lihat Platform",
  "platform.tenants.manage": "Kelola Tenant",
  "platform.expansions.approve": "Setujui Ekspansi",
  "platform.quotas.manage": "Kelola Kuota",
  "platform.maintenance.manage": "Kelola Maintenance",
  "platform.monitoring.view": "Lihat Monitoring",
};
