'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';

export interface FabProps {
  label: string;
  onClick: () => void;
}

// Sits above the bottom tab bar on phones; bottom-right of the content on tablets.
export function Fab({ label, onClick }: FabProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-[var(--radius-full)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg active:scale-95 lg:hidden bottom-[calc(5rem+env(safe-area-inset-bottom)+0.5rem)] md:bottom-6 md:right-6"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
