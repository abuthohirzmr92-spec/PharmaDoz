import {
  LayoutDashboard,
  Users,
  Store,
  Activity,
  Brain,
  Package,
  Settings,
  ClipboardList,
  Tag,
  CreditCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/types";

export interface PlatformNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  children?: PlatformNavItem[];
}

export interface PlatformNavGroup {
  label: string;
  items: PlatformNavItem[];
}

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  {
    label: "Platform",
    items: [
      {
        href: "/platform",
        label: "Dashboard Platform",
        icon: LayoutDashboard,
        permission: "platform.view",
      },
      {
        href: "/platform/tenants",
        label: "Manajemen Tenant",
        icon: Users,
        permission: "platform.tenants.manage",
      },
      {
        href: "/platform/expansions",
        label: "Ekspansi Cabang",
        icon: Store,
        permission: "platform.expansions.approve",
      },
      {
        href: "/platform/packages",
        label: "Paket Langganan",
        icon: Package,
        permission: "platform.quotas.manage",
      },
      {
        href: "/platform/settings",
        label: "Pengaturan Platform",
        icon: Settings,
        permission: "platform.view",
      },
    ],
  },
  {
    label: "Subscription Management",
    items: [
      {
        href: "/platform/trials",
        label: "Permintaan Trial",
        icon: ClipboardList,
        permission: "platform.view",
      },
      {
        href: "/platform/subscriptions",
        label: "Langganan Aktif",
        icon: CreditCard,
        permission: "platform.view",
      },
      {
        href: "/platform/promotions",
        label: "Promosi",
        icon: Tag,
        permission: "platform.quotas.manage",
      },
      {
        href: "/platform/providers",
        label: "Penyedia Pembayaran",
        icon: CreditCard,
        permission: "platform.view",
      },
      {
        href: "/platform/billing",
        label: "Monitor Penagihan",
        icon: Settings,
        permission: "platform.view",
      },
    ],
  },
  {
    label: "Sistem",
    items: [
      {
        href: "/platform/monitoring",
        label: "Monitoring",
        icon: Activity,
        permission: "platform.monitoring.view",
      },
      {
        href: "/platform/diagnostics",
        label: "Diagnostics AI",
        icon: Brain,
        permission: "platform.view",
      },
      {
        href: "/platform/maintenance",
        label: "Maintenance",
        icon: Activity,
        permission: "platform.view",
      },
      {
        href: "/platform/scheduler",
        label: "Scheduler",
        icon: Activity,
        permission: "platform.view",
      },
      {
        href: "/platform/audit",
        label: "Audit & Log",
        icon: Activity,
        permission: "platform.view",
      },
      {
        href: "/platform/runtime",
        label: "Validasi Runtime",
        icon: Activity,
        permission: "platform.view",
      },
    ],
  },
];
