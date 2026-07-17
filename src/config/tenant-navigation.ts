import {
  LayoutDashboard, Package, Pill, ShoppingCart,
  FileText, Settings, Store, Wallet, TrendingUp, BookOpen,
  Building2, Users, Plug, UserCircle, CreditCard,
} from "lucide-react";
import type { NavItem } from "./navigation";

export const TENANT_NAVIGATION: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",  icon: LayoutDashboard, permission: "reports.sales.view" },
  { label: "Inventory",     href: "/inventory",  icon: Package,         permission: "inventory.stock.view" },
  { label: "Products",      href: "/products",   icon: Pill,            permission: "products.view" },
  { label: "Cashier",       href: "/cashier",    icon: ShoppingCart,    permission: "cashier.transaction.create" },
  { label: "Branches",      href: "/branches",   icon: Store,           permission: "settings.view" },
  { label: "Keuangan",      href: "/finance",    icon: Wallet,          permission: "finance.wallet.view" },
  { label: "Insight Bisnis",href: "/finance/insight", icon: TrendingUp, permission: "finance.wallet.view" },
  { label: "Ledger",        href: "/finance/ledger",   icon: BookOpen,  permission: "finance.wallet.view" },
  { label: "Reports",       href: "/reports",    icon: FileText,        permission: "reports.sales.view" },
  {
    label: "Settings",
    icon: Settings,
    permission: "settings.view",
    // Group node — no href; expand/collapse only. All children keep their routes.
    children: [
      { label: "Konfigurasi Apotek", href: "/settings/config",      icon: Building2,   permission: "settings.view" },
      { label: "Pengguna",           href: "/settings/users",       icon: Users,       permission: "users.view" },
      { label: "Integrasi",          href: "/settings/integration", icon: Plug,        permission: "settings.view" },
      { label: "Langganan",          href: "/settings/subscription", icon: CreditCard, permission: "billing.view" },
      { label: "Akun Saya",          href: "/settings/account",     icon: UserCircle },
    ],
  },
];
