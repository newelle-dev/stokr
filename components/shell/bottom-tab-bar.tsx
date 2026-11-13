'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isActive, isMoreActive, type NavItem } from '@/lib/nav';
import { NAV_ICONS } from '@/components/shell/nav-icons';
import { MoreSheet } from '@/components/shell/more-sheet';

export interface BottomTabBarProps {
  tabs: NavItem[];
  moreItems?: NavItem[];
  signOut?: React.ReactNode;
  hideOnDesktop?: boolean;
}

const TAB_CLASS =
  'flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] py-1.5 transition-colors';

export function BottomTabBar({ tabs, moreItems, signOut, hideOnDesktop = false }: BottomTabBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const MoreIcon = NAV_ICONS.more;
  const moreActive = isMoreActive(pathname);

  return (
    <>
      <nav
        aria-label="Main"
        className={`fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around border-t border-[var(--border)] bg-[var(--card)]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md ${hideOnDesktop ? 'md:hidden' : ''}`}
      >
        {tabs.map((tab) => {
          const Icon = NAV_ICONS[tab.icon];
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`${TAB_CLASS} h-16 ${active ? 'font-semibold text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}
            >
              <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[11px] leading-tight">{tab.label}</span>
            </Link>
          );
        })}

        {moreItems && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={`${TAB_CLASS} h-16 ${moreActive ? 'font-semibold text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}
          >
            <MoreIcon className={`h-5 w-5 ${moreActive ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] leading-tight">More</span>
          </button>
        )}
      </nav>

      {moreItems && (
        <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} items={moreItems} signOut={signOut} />
      )}
    </>
  );
}
