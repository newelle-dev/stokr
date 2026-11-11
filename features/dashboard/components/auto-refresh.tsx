'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const REFRESH_MS = 30000;

/** Re-runs the server page every 30 seconds; the branch filter lives in the URL so it is kept. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
