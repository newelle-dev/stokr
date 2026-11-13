import * as React from 'react';
import { requireStaffOrOwnerPage } from '@/lib/auth';
import { SignOutButton } from '@/components/shared/sign-out-button';
import { AppHeader } from '@/components/shell/app-header';
import { BottomTabBar } from '@/components/shell/bottom-tab-bar';
import { PullToRefresh } from '@/components/shell/pull-to-refresh';
import { staffTabsFor } from '@/lib/nav';

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaffOrOwnerPage();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <AppHeader
        right={
          <>
            <span className="max-w-24 truncate text-xs font-medium text-[var(--foreground)]">
              {user.fullName.split(' ')[0]}
            </span>
            <SignOutButton className="min-h-11 min-w-11" />
          </>
        }
      />
      <PullToRefresh />

      {/* Main Content Area, with room for the bottom tab bar */}
      <main className="mx-auto w-full max-w-lg flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <BottomTabBar tabs={staffTabsFor(user.role)} />
    </div>
  );
}
