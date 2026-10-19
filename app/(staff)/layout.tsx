import * as React from 'react';
import { requireStaffOrOwnerPage } from '@/lib/auth';
import { SignOutButton } from '@/components/shared/sign-out-button';

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
            S
          </div>
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
          <SignOutButton />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">{children}</main>
    </div>
  );
}
