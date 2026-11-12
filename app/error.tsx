'use client';

import { Button } from '@/components/ui/button';

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-4">
      <div role="alert" className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="text-base font-medium text-[var(--foreground)]">Something went wrong.</p>
        <p className="text-sm text-[var(--muted-foreground)]">Check your connection and try again.</p>
        <Button type="button" onClick={reset} className="h-12 w-full text-base">
          Try again
        </Button>
      </div>
    </main>
  );
}
