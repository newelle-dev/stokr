'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reassignStaffBranchSchema, type ReassignStaffBranchInput } from '../schemas';
import { reassignStaffBranchAction } from '../actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { TeamMemberItem } from '../types';

interface ReassignBranchModalProps {
  staff: TeamMemberItem | null;
  branches: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
}

export function ReassignBranchModal({
  staff,
  branches,
  isOpen,
  onClose,
}: ReassignBranchModalProps) {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReassignStaffBranchInput>({
    resolver: zodResolver(reassignStaffBranchSchema),
    values: {
      staffId: staff?.id ?? '',
      branchId: staff?.branchId ?? branches[0]?.id ?? '',
    },
  });

  if (!staff) return null;

  const onSubmit = async (data: ReassignStaffBranchInput) => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await reassignStaffBranchAction(data);
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onClose();
    } catch {
      setErrorMsg('Failed to reassign branch. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setErrorMsg(null);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Reassign ${staff.fullName}`}
      description="Change the branch location this staff member is assigned to."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)] font-medium"
          >
            {errorMsg}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="targetBranch" className="text-sm font-medium">
            New Assigned Branch
          </Label>
          <select
            id="targetBranch"
            className="flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
            disabled={isSubmitting}
            {...register('branchId')}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {errors.branchId && (
            <p className="text-xs text-[var(--destructive)]">
              {errors.branchId.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Branch Assignment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
