'use client';

import * as React from 'react';
import { Ban } from 'lucide-react';
import { deactivateStaffAction } from '../actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { TeamMemberItem } from '../types';

interface DeactivateStaffModalProps {
  staff: TeamMemberItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeactivateStaffModal({
  staff,
  isOpen,
  onClose,
}: DeactivateStaffModalProps) {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!staff) return null;

  const handleDeactivate = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await deactivateStaffAction({ staffId: staff.id });
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onClose();
    } catch {
      setErrorMsg('Failed to deactivate staff member. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Deactivate ${staff.fullName}?`}
      description="Revoke account access and ban login."
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

        <div className="rounded-[var(--radius-md)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-4 text-sm text-[var(--foreground)] space-y-2">
          <p className="font-semibold text-[var(--destructive)]">
            Immediate Access Revocation
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Deactivating <strong className="text-[var(--foreground)]">{staff.fullName}</strong> (<span className="font-mono">{staff.username}</span>) will immediately terminate their active session, invalidate their authentication tokens, and prevent further logins. Historical sales and audit logs recorded by this staff member are preserved.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeactivate}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            <Ban className="h-4 w-4" />
            <span>{isSubmitting ? 'Deactivating…' : 'Confirm Deactivation'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
