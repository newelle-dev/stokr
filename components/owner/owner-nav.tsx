'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  ShoppingCart,
  Boxes,
  BarChart3,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    enabled: true,
  },
  {
    label: 'Products',
    href: '/products',
    icon: Package,
    enabled: true,
  },
  {
    label: 'Team',
    href: '/team',
    icon: Users,
    enabled: true,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    enabled: true,
  },
  {
    label: 'Sales',
    href: '#',
    icon: ShoppingCart,
    enabled: false,
    badge: 'Unit 4',
  },
  {
    label: 'Inventory',
    href: '#',
    icon: Boxes,
    enabled: false,
    badge: 'Unit 4',
  },
  {
    label: 'Reports',
    href: '#',
    icon: BarChart3,
    enabled: false,
    badge: 'Unit 5',
  },
];

export function OwnerDesktopSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.enabled && pathname.startsWith(item.href);

        if (!item.enabled) {
          return (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--muted-foreground)]/50 cursor-not-allowed select-none"
              title="Coming in later units"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="rounded-[var(--radius-sm)] bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                  {item.badge}
                </span>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function OwnerMobileTabBar() {
  const pathname = usePathname();

  // Mobile bar only shows the 4 currently enabled primary screens
  const mobileItems = NAV_ITEMS.filter((item) => item.enabled);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-md px-2 md:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] py-1.5 px-3 transition-colors ${
              isActive
                ? 'text-[var(--primary)] font-semibold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
