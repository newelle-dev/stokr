'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';

export function RowList({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:hidden overflow-hidden divide-y divide-[var(--border)] rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] shadow-xs">
      {children}
    </div>
  );
}

export interface ListRowProps {
  title: React.ReactNode;
  detail?: React.ReactNode;
  trailing?: React.ReactNode;
  muted?: boolean;
  onClick: () => void;
}

export function ListRow({ title, detail, trailing, muted, onClick }: ListRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full min-h-14 items-center gap-3 px-4 py-3 text-left active:bg-[var(--muted)] ${
        muted ? 'opacity-70' : ''
      }`}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="truncate font-semibold text-base text-[var(--foreground)]">{title}</div>
        {detail && <div className="truncate text-sm text-[var(--muted-foreground)]">{detail}</div>}
      </div>
      {trailing && <div className="shrink-0 text-sm">{trailing}</div>}
      <ChevronRight className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]" aria-hidden />
    </button>
  );
}
