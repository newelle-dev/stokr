'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { canSwipeBack, parentRoute } from '@/lib/nav';
import { isSwipeBack, dialogIsOpen } from '@/lib/gestures';

// Swipe right from the left edge on read-only sub-pages. Never mounted behaviour on forms or the sell screen.
export function SwipeBack() {
  const pathname = usePathname();
  const router = useRouter();
  const start = React.useRef<{ x: number; y: number } | null>(null);

  const parent = parentRoute(pathname);
  const enabled = canSwipeBack(pathname) && parent !== null;

  React.useEffect(() => {
    if (!enabled || !parent) return;

    const onStart = (e: TouchEvent) => {
      start.current =
        e.touches.length === 1 && !dialogIsOpen(document)
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : null;
    };
    const onEnd = (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      if (isSwipeBack(s.x, s.y, t.clientX, t.clientY)) router.push(parent);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [enabled, parent, router]);

  return null;
}
