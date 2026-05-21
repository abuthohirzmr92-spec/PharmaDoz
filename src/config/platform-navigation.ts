import {
  LayoutDashboard,
  Users,
  Store,
  Activity,
  Brain,
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
    ],
  },
];
