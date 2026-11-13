'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isTabActive, type NavItem } from '@/lib/nav';
import { NAV_ICONS } from '@/components/shell/nav-icons';

export interface BottomTabBarProps {
  tabs: NavItem[];
  hideOnDesktop?: boolean;
}

export function BottomTabBar({ tabs, hideOnDesktop = false }: BottomTabBarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={`fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around border-t border-[var(--border)] bg-[var(--card)]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md ${hideOnDesktop ? 'md:hidden' : ''}`}
    >
      {tabs.map((tab) => {
        const Icon = NAV_ICONS[tab.icon];
        const active = isTabActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`flex h-16 min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] py-1.5 transition-colors ${active ? 'font-semibold text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}
          >
            <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] leading-tight">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
