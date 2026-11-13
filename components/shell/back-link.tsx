'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { parentRoute } from '@/lib/nav';

// Sits above the page title on sub-pages. Profile goes back to wherever it was opened from.
export function BackLink() {
  const pathname = usePathname();
  const router = useRouter();
  const parent = parentRoute(pathname);
  if (!parent) return null;

  const onClick = (e: React.MouseEvent) => {
    if ((pathname === '/profile' || pathname === '/me') && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <Link
      href={parent}
      onClick={onClick}
      className="-ml-2 mb-2 flex min-h-11 w-fit items-center gap-0.5 rounded-[var(--radius-md)] pr-3 text-sm font-medium text-[var(--foreground)] active:bg-[var(--muted)]"
    >
      <ChevronLeft className="h-5 w-5" />
      Back
    </Link>
  );
}
