import {
  LayoutDashboard,
  Package,
  Pill,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  Store,
  Wallet,
  TrendingUp,
} from "lucide-react";
import type { NavItem } from "./navigation";

export const TENANT_NAVIGATION: NavItem[] = [
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
    label: "Branches",
    href: "/branches",
    icon: Store,
    permission: "settings.view",
  },
  {
    label: "Keuangan",
    href: "/finance",
    icon: Wallet,
    permission: "finance.wallet.view",
  },
  {
    label: "Insight Bisnis",
    href: "/finance/insight",
    icon: TrendingUp,
    permission: "finance.wallet.view",
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
