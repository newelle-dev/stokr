'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { isTabActive, parentRoute, type NavItem } from '@/lib/nav';
import { NAV_ICONS } from '@/components/shell/nav-icons';

export interface BottomTabBarProps {
  tabs: NavItem[];
  hideOnDesktop?: boolean;
}

const ITEM_CLASS =
  'flex h-16 min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] py-1.5 transition-colors';

export function BottomTabBar({ tabs, hideOnDesktop = false }: BottomTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const parent = parentRoute(pathname);

  // Profile can be opened from any page, so Back there returns to where the user came from.
  const goBack = (e: React.MouseEvent) => {
    if ((pathname === '/profile' || pathname === '/me') && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <nav
      aria-label="Main"
      className={`fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around border-t border-[var(--border)] bg-[var(--card)]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md ${hideOnDesktop ? 'md:hidden' : ''}`}
    >
      {parent && (
        <Link href={parent} onClick={goBack} aria-label="Back" className={`${ITEM_CLASS} text-[var(--foreground)]`}>
          <ChevronLeft className="h-5 w-5" />
          <span className="text-[11px] leading-tight">Back</span>
        </Link>
      )}
      {tabs.map((tab) => {
        const Icon = NAV_ICONS[tab.icon];
        const active = isTabActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`${ITEM_CLASS} ${active ? 'font-semibold text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}
          >
            <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] leading-tight">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
