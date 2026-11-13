'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { pageTitle, parentRoute } from '@/lib/nav';
import { Logo } from '@/components/ui/logo';

export function AppHeader({ right }: { right?: React.ReactNode }) {
  const pathname = usePathname();
  const parent = parentRoute(pathname);
  const title = pageTitle(pathname);

  return (
    <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--card)]/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      {parent ? (
        <div className="flex min-w-0 items-center gap-1">
          <Link
            href={parent}
            aria-label="Back"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--foreground)] active:bg-[var(--muted)]"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h2 className="truncate text-lg font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
        </div>
      ) : (
        <Link href="/" className="flex items-center">
          <Logo height={20} width={115} />
        </Link>
      )}
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
