import {
  LayoutDashboard,
  Package,
  Pill,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  Shield,
  Store,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
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
  {
    label: "Admin",
    href: "/admin",
    icon: Shield,
    permission: "platform.view",
  },
  {
    label: "Tenants",
    href: "/admin/tenants",
    icon: Store,
    permission: "platform.tenants.manage",
  },
  {
    label: "Monitoring",
    href: "/admin/monitoring",
    icon: Activity,
    permission: "platform.monitoring.view",
  },
];
