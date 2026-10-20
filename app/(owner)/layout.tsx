import * as React from 'react';
import Link from 'next/link';
import { requireOwnerPage } from '@/lib/auth';
import { SignOutButton } from '@/components/shared/sign-out-button';
import { Logo } from '@/components/ui/logo';
import { OwnerDesktopSidebar, OwnerMobileTabBar } from '@/components/owner/owner-nav';

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
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-md px-4 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo height={20} width={115} />
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted-foreground)]">
              {user.fullName.split(' ')[0]}
            </span>
            <SignOutButton />
          </div>
        </header>

        {/* Content Body with bottom padding for mobile tab bar */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <OwnerMobileTabBar />
      </div>
    </div>
  );
}
