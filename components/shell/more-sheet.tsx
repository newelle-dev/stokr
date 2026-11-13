'use client';

import * as React from 'react';
import Link from 'next/link';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import type { NavItem } from '@/lib/nav';
import { NAV_ICONS } from '@/components/shell/nav-icons';

export interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  signOut?: React.ReactNode;
}

export function MoreSheet({ open, onClose, items, signOut }: MoreSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs animate-in fade-in" />
        <div className="fixed inset-x-0 bottom-0 z-50">
          <Dialog.Popup className="w-full rounded-t-[var(--radius-xl)] border border-b-0 border-[var(--border)] bg-[var(--card)] px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl outline-none animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-2">
              <Dialog.Title className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                More
              </Dialog.Title>
              <Dialog.Close
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted-foreground)] active:bg-[var(--muted)]"
              >
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            <ul className="space-y-1">
              {items.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] px-3 text-base font-medium text-[var(--foreground)] active:bg-[var(--muted)]"
                    >
                      <Icon className="h-5 w-5 text-[var(--muted-foreground)]" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {signOut && <div className="mt-3 border-t border-[var(--border)] pt-3">{signOut}</div>}
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
