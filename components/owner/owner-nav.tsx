'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SIDEBAR_ITEMS, TABLET_EXTRA_ITEMS, isActive as isRouteActive } from '@/lib/nav';
import { NAV_ICONS } from '@/components/shell/nav-icons';

export function OwnerDesktopSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {SIDEBAR_ITEMS.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        // Stock count and Opening stock are listed on their own below, so Stock is not highlighted there too.
        const isActive =
          item.enabled &&
          pathname.startsWith(item.href) &&
          !TABLET_EXTRA_ITEMS.some((extra) => isRouteActive(pathname, extra.href));

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

      {/* Tablet only: pages the phone reaches through More. Desktop (lg and up) is unchanged. */}
      <div className="mt-4 space-y-1 border-t border-[var(--border)] pt-4 lg:hidden">
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">More</p>
        {TABLET_EXTRA_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = isRouteActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
