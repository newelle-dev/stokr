import * as React from 'react';
import { requireStaffOrOwnerPage } from '@/lib/auth';
import { AppHeader } from '@/components/shell/app-header';
import { BackLink } from '@/components/shell/back-link';
import { BottomTabBar } from '@/components/shell/bottom-tab-bar';
import { PullToRefresh } from '@/components/shell/pull-to-refresh';
import { staffTabsFor, profileHref } from '@/lib/nav';

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaffOrOwnerPage();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <AppHeader profileHref={profileHref(user.role)} initial={user.fullName.charAt(0)} />
      <PullToRefresh />

      {/* Main Content Area, with room for the bottom tab bar */}
      <main className="mx-auto w-full max-w-lg flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <BackLink />
        {children}
      </main>

      <BottomTabBar tabs={staffTabsFor(user.role)} />
    </div>
  );
}
