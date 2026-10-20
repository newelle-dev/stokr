'use client';

import * as React from 'react';
import { Copy, Check, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StoreCodeCardProps {
  shopName: string;
  storeCode: string;
}

export function StoreCodeCard({ shopName, storeCode }: StoreCodeCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(storeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {shopName}
            </h3>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Your unique shop store code. Staff use this code to sign in from mobile phones.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--muted)]/50 p-2 pl-3">
          <span className="font-mono text-base font-bold text-[var(--foreground)] tracking-wide">
            {storeCode}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 gap-1.5 px-2.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
