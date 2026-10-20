'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, Users } from 'lucide-react';
import { deactivateBranchAction } from '../actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { BranchItem } from '../types';

interface DeactivateBranchModalProps {
  branch: BranchItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeactivateBranchModal({
  branch,
  isOpen,
  onClose,
}: DeactivateBranchModalProps) {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!branch) return null;

  const hasActiveStaff = branch.activeStaffCount > 0;

  const handleDeactivate = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await deactivateBranchAction({ id: branch.id });
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onClose();
    } catch {
      setErrorMsg('Failed to deactivate branch. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Deactivate "${branch.name}"?`}
      description="Deactivating a branch removes it from active operations while preserving all historical sales and inventory records."
    >
      <div className="space-y-4">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)] font-medium"
          >
            {errorMsg}
          </div>
        )}

        {hasActiveStaff ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4 text-sm text-[var(--foreground)] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-[var(--warning)]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Cannot deactivate branch</span>
            </div>
            <p className="text-[var(--muted-foreground)]">
              There {branch.activeStaffCount === 1 ? 'is' : 'are'} currently{' '}
              <strong className="text-[var(--foreground)]">
                {branch.activeStaffCount} active staff member{branch.activeStaffCount > 1 ? 's' : ''}
              </strong>{' '}
              assigned to this branch. In accordance with Stokr safety rules, you must reassign them to another active branch before deactivating this branch.
            </p>
            <div className="pt-2">
              <Link
                href="/team"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Go to Team Page to Reassign Staff →</span>
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            Are you sure you want to deactivate <strong className="text-[var(--foreground)]">{branch.name}</strong>? No staff members are assigned to this branch. You can reactivate this branch at any time.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {!hasActiveStaff && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deactivating…' : 'Confirm Deactivation'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
