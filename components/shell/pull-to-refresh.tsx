'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { canPullRefresh } from '@/lib/nav';
import { pullProgress, dialogIsOpen } from '@/lib/gestures';

// Pull down at the top of a read-only list to re-read the server data (same as the page's own reads).
export function PullToRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const [progress, setProgress] = React.useState(0);
  const [refreshing, startRefresh] = React.useTransition();
  const startY = React.useRef<number | null>(null);
  const latest = React.useRef(0);

  const enabled = canPullRefresh(pathname);

  React.useEffect(() => {
    if (!enabled) return;

    const onStart = (e: TouchEvent) => {
      startY.current =
        window.scrollY <= 0 && !dialogIsOpen(document) ? e.touches[0].clientY : null;
      latest.current = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      latest.current = pullProgress(startY.current, e.touches[0].clientY, window.scrollY);
      setProgress(latest.current);
    };
    const onEnd = () => {
      if (startY.current !== null && latest.current >= 1) {
        startRefresh(() => router.refresh());
      }
      startY.current = null;
      latest.current = 0;
      setProgress(0);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled, router]);

  if (!enabled || (progress === 0 && !refreshing)) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-[calc(4rem+env(safe-area-inset-top))] z-20 -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--card)] p-2 shadow-md"
      style={{ opacity: refreshing ? 1 : progress }}
    >
      <RefreshCw
        className={`h-4 w-4 text-[var(--primary)] ${refreshing ? 'animate-spin' : ''}`}
        style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
      />
      <span className="sr-only">{refreshing ? 'Refreshing' : 'Pull to refresh'}</span>
    </div>
  );
}
