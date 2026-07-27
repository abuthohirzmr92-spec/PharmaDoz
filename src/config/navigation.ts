import {
  LayoutDashboard,
  Package,
  Pill,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  TrendingUp,
  AlertTriangle,
  Clipboard,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/types";

export interface NavItem {
  label: string;
  /** Optional: group nodes (e.g. "Settings") have no href — expand/collapse only. */
  href?: string;
  icon: LucideIcon;
  permission?: Permission;
  /** Child items for a sidebar group. */
  children?: NavItem[];
}

export const mainNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "reports.sales.view",
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Package,
    permission: "inventory.stock.view",
    children: [
      { label: "Dashboard",  href: "/inventory",            icon: LayoutDashboard, permission: "inventory.stock.view" },
      { label: "Stok",       href: "/inventory/stock",      icon: Package,         permission: "inventory.stock.view" },
      { label: "Pembelian",  href: "/inventory/purchase",   icon: ShoppingCart,    permission: "inventory.stock.view" },
      { label: "Mutasi",     href: "/inventory/movement",   icon: TrendingUp,      permission: "inventory.stock.view" },
      { label: "Kadaluarsa", href: "/inventory/expired",    icon: AlertTriangle,   permission: "inventory.stock.view" },
      { label: "Opname",     href: "/inventory/opname",     icon: Clipboard,       permission: "inventory.stock.view" },
      { label: "Supplier",   href: "/inventory/suppliers",  icon: Truck,           permission: "inventory.stock.view" },
    ],
  },
  {
    label: "Products",
    href: "/products",
    icon: Pill,
    permission: "products.view",
  },
  {
    label: "Cashier",
    href: "/cashier",
    icon: ShoppingCart,
    permission: "cashier.transaction.create",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
    permission: "reports.sales.view",
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    permission: "users.view",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    permission: "settings.view",
  },
];

export { TENANT_NAVIGATION } from "./tenant-navigation";
