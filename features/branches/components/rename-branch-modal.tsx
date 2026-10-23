'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { updateBranchSchema, type UpdateBranchInput } from '../schemas';
import { renameBranchAction } from '../actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BranchItem } from '../types';

interface RenameBranchModalProps {
  branch: BranchItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RenameBranchModal({
  branch,
  isOpen,
  onClose,
}: RenameBranchModalProps) {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateBranchInput>({
    resolver: zodResolver(updateBranchSchema),
    values: {
      id: branch?.id ?? '',
      name: branch?.name ?? '',
    },
  });

  const onSubmit = async (data: UpdateBranchInput) => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await renameBranchAction(data);
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onClose();
    } catch {
      setErrorMsg('Failed to rename branch. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setErrorMsg(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Rename Branch"
      description="Update the name of this branch."
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
          <Label htmlFor="renameBranch" className="text-sm font-medium">
            Branch Name
          </Label>
          <Input
            id="renameBranch"
            type="text"
            className="h-11"
            disabled={isSubmitting}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs text-[var(--destructive)]">
              {errors.name.message}
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
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
