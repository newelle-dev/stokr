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
        {/* Phones: bottom sheet. md and up (and the temporary-password dialog): centered. */}
        <div
          className={`fixed inset-0 z-50 flex justify-center ${
            isTempPasswordDisplayed ? 'items-center p-4' : 'items-end p-0 md:items-center md:p-4'
          }`}
        >
          <Dialog.Popup
            className={`relative z-10 w-full max-w-lg overflow-y-auto border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl outline-none ${
              isTempPasswordDisplayed
                ? 'max-h-[90dvh] rounded-[var(--radius-xl)] animate-in zoom-in-95'
                : 'max-h-[90dvh] rounded-t-[var(--radius-xl)] border-b-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom md:rounded-[var(--radius-xl)] md:border-b md:pb-6 md:zoom-in-95 md:slide-in-from-bottom-0'
            }`}
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
