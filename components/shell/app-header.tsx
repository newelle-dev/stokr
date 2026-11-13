'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { headerTitle } from '@/lib/nav';

// Height of the sticky header; the page's big title counts as "out of view" once it slides under it.
const HEADER_PX = 57;

export function AppHeader({ profileHref, initial }: { profileHref: string; initial: string }) {
  const pathname = usePathname();
  const title = headerTitle(pathname);
  // Remember which page the flag belongs to, so it resets by itself when the route changes.
  const [reveal, setReveal] = React.useState({ path: '', show: false });
  const showTitle = reveal.path === pathname && reveal.show;

  // Show the title in the header once the page's own big title (the first h1) has scrolled under it.
  // Pages without an h1 show it straight away. Re-checked on scroll and when the page content streams in.
  React.useEffect(() => {
    const evaluate = () => {
      const h1 = document.querySelector('main h1:not(.sr-only)');
      const show = h1 ? h1.getBoundingClientRect().bottom < HEADER_PX : true;
      setReveal((prev) => (prev.path === pathname && prev.show === show ? prev : { path: pathname, show }));
    };
    const id = requestAnimationFrame(evaluate);
    window.addEventListener('scroll', evaluate, { passive: true });
    const main = document.querySelector('main');
    const observer = new MutationObserver(evaluate);
    if (main) observer.observe(main, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('scroll', evaluate);
      observer.disconnect();
    };
  }, [pathname]);

  const onProfile = pathname === profileHref;

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <div />

        <p
          aria-hidden={!showTitle}
          className={`max-w-[50vw] truncate text-base font-semibold tracking-tight text-[var(--foreground)] transition-all duration-200 motion-reduce:transition-none ${showTitle ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
        >
          {title}
        </p>

        <div className="flex justify-end">
          <Link
            href={profileHref}
            aria-label="Profile"
            aria-current={onProfile ? 'page' : undefined}
            className="-mr-1 flex h-11 w-11 items-center justify-center"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold uppercase ${onProfile ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]' : 'border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]'}`}
            >
              {initial}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
