import * as React from 'react';
import Link from 'next/link';
import { requireStaffOrOwnerPage } from '@/lib/auth';
import { SignOutButton } from '@/components/shared/sign-out-button';
import { LogoMark } from '@/components/ui/logo';

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaffOrOwnerPage();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* Top Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <div>
            <div className="text-base font-semibold leading-tight text-[var(--foreground)]">
              Stokr
            </div>
            <div className="text-xs text-[var(--muted-foreground)] capitalize">
              {user.role} Portal
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="font-medium text-[var(--foreground)]">{user.fullName}</div>
          </div>
          <SignOutButton className="min-h-11 min-w-11" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        <nav
          aria-label="Staff pages"
          className={`mb-4 grid gap-2 ${user.role === 'owner' ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          <Link
            href="/sell"
            className="flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)] active:bg-[var(--muted)]"
          >
            Sell
          </Link>
          <Link
            href="/my-sales"
            className="flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)] active:bg-[var(--muted)]"
          >
            My sales
          </Link>
          {user.role === 'owner' && (
            <Link
              href="/dashboard"
              className="flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)] active:bg-[var(--muted)]"
            >
              Owner area
            </Link>
          )}
        </nav>
        {children}
      </main>
    </div>
  );
}
