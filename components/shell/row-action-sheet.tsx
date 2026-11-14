'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

export interface SheetAction {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface RowActionSheetProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  actions: SheetAction[];
}

export function RowActionSheet({ title, description, isOpen, onClose, actions }: RowActionSheetProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description}>
      <div className="flex flex-col gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                // Close first so the action's own dialog does not stack on top of the sheet.
                onClose();
                action.onSelect();
              }}
              className={`flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-left text-base font-medium disabled:opacity-50 ${
                action.destructive
                  ? 'text-[var(--destructive)]'
                  : 'text-[var(--foreground)]'
              }`}
            >
              {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
