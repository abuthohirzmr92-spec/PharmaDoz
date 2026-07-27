"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface NavItemProps {
  label: string;
  href?: string;
  icon: ReactNode;
  collapsed?: boolean;
  subItems?: NavItemProps[];
}

const leafBase =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const activeCls =
  "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300";
const idleCls =
  "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

export function NavItem({ label, href, icon, collapsed, subItems }: NavItemProps) {
  // Group node (has children) — expand/collapse with accordion behavior.
  if (subItems && subItems.length > 0) {
    return <NavGroup label={label} href={href} icon={icon} collapsed={collapsed} items={subItems} />;
  }

  return <NavLeaf label={label} href={href} icon={icon} collapsed={collapsed} />;
}

function useIsActive() {
  const pathname = usePathname();
  return (href?: string) =>
    !!href && (pathname === href || pathname.startsWith(href + "/"));
}

function NavLeaf({ label, href, icon, collapsed }: NavItemProps) {
  const isActive = useIsActive();
  const active = isActive(href);

  return (
    <Link
      href={href ?? "#"}
      className={cn(leafBase, active ? activeCls : idleCls, collapsed && "justify-center px-2")}
      title={collapsed ? label : undefined}
    >
      <span className="h-5 w-5 shrink-0">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function NavGroup({
  label,
  href,
  icon,
  collapsed,
  items,
}: {
  label: string;
  href?: string;
  icon: ReactNode;
  collapsed?: boolean;
  items: NavItemProps[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = useIsActive();

  // A group is "active" when the URL matches the group's own href OR any child's href.
  const groupActive =
    (!!href && (pathname === href || pathname.startsWith(href + "/"))) ||
    items.some((c) => isActive(c.href));

  // Open state is URL-derived (accordion: only one group open at a time).
  const [open, setOpen] = useState(groupActive);

  // Sync open state with URL on navigation.
  useEffect(() => {
    setOpen(groupActive);
  }, [groupActive]);

  // Collapsed (icon) sidebar mode: render child icons directly.
  if (collapsed) {
    return (
      <div className="space-y-1">
        {items.map((c) => {
          const isChildActive = c.href === href ? pathname === c.href : isActive(c.href);
          return (
            <Link
              key={c.href ?? c.label}
              href={c.href ?? "#"}
              title={c.label}
              className={cn(leafBase, "justify-center px-2", isChildActive ? activeCls : idleCls)}
            >
              <span className="h-5 w-5 shrink-0">{c.icon}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  /** Click parent: navigate if href exists, toggle otherwise. */
  const handleParentClick = () => {
    if (href) {
      router.push(href);
      setOpen(true);
    } else {
      setOpen((o) => !o);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleParentClick}
        aria-expanded={open}
        className={cn(leafBase, "w-full", groupActive ? activeCls : idleCls)}
      >
        <span className="h-5 w-5 shrink-0">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-1 space-y-1 pl-4">
          {items.map((c) => {
            const isChildActive = c.href === href ? pathname === c.href : isActive(c.href);
            return (
              <Link
                key={c.href ?? c.label}
                href={c.href ?? "#"}
                className={cn(leafBase, isChildActive ? activeCls : idleCls)}
              >
                <span className="h-4 w-4 shrink-0">{c.icon}</span>
                <span>{c.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
