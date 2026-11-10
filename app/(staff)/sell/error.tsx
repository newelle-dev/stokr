'use client';

import { Button } from '@/components/ui/button';

export default function SellError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-base font-medium text-[var(--foreground)]">The sales counter could not load.</p>
      <p className="text-sm text-[var(--muted-foreground)]">Check your connection and try again.</p>
      <Button type="button" onClick={reset} className="h-12 w-full text-base">
        Try again
      </Button>
    </div>
  );
}
