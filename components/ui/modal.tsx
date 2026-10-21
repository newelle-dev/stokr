'use client';

import * as React from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  disableDismissal?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  disableDismissal,
}: ModalProps) {
  const isTempPasswordDisplayed =
    Boolean(disableDismissal) ||
    title.toLowerCase().includes('temporary') ||
    title.toLowerCase().includes('account created') ||
    title.toLowerCase().includes('password reset successful') ||
    (description ? description.toLowerCase().includes('temporary') : false);

  return (
    <Dialog.Root
      open={isOpen}
      modal={true}
      disablePointerDismissal={isTempPasswordDisplayed}
      onOpenChange={(open, details) => {
        if (!open) {
          if (
            isTempPasswordDisplayed &&
            (details.reason === 'outside-press' || details.reason === 'escape-key')
          ) {
            return;
          }
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl animate-in zoom-in-95 outline-none"
          >
            <div className="flex items-start justify-between pb-4">
              <div className="space-y-1">
                <Dialog.Title className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="text-sm text-[var(--muted-foreground)]">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                onClick={onClose}
                className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            <div>{children}</div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
