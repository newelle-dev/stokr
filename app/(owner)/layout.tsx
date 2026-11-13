import * as React from 'react';
import Link from 'next/link';
import { requireOwnerPage } from '@/lib/auth';
import { SignOutButton } from '@/components/shared/sign-out-button';
import { Logo } from '@/components/ui/logo';
import { OwnerDesktopSidebar } from '@/components/owner/owner-nav';
import { AppHeader } from '@/components/shell/app-header';
import { BottomTabBar } from '@/components/shell/bottom-tab-bar';
import { OWNER_TABS, MORE_ITEMS } from '@/lib/nav';

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireOwnerPage();

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Desktop Left Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-20 border-r border-[var(--border)] bg-[var(--card)]">
        <div className="flex h-16 items-center px-5 border-b border-[var(--border)]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo height={22} width={130} />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto">
          <OwnerDesktopSidebar />
        </div>

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between gap-2">
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-[var(--foreground)] truncate">
              {user.fullName}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] truncate">
              Owner
            </p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        {/* Mobile Top Header (hidden on desktop) */}
        <div className="md:hidden">
          <AppHeader />
        </div>

        {/* Content Body with bottom padding for mobile tab bar */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Tab Bar: Dashboard, Sales, Stock, More */}
        <BottomTabBar
          tabs={OWNER_TABS}
          moreItems={MORE_ITEMS}
          signOut={<SignOutButton className="min-h-11 w-full" />}
          hideOnDesktop
        />
      </div>
    </div>
  );
}
