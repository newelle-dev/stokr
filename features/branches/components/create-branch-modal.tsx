'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBranchSchema, type CreateBranchInput } from '../schemas';
import { createBranchAction } from '../actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBranchModal({ isOpen, onClose }: CreateBranchModalProps) {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBranchInput>({
    resolver: zodResolver(createBranchSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = async (data: CreateBranchInput) => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await createBranchAction(data);
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setIsSubmitting(false);
        return;
      }
      reset();
      setIsSubmitting(false);
      onClose();
    } catch {
      setErrorMsg('Failed to create branch. Please try again.');
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
      title="Add Branch"
      description="Add a new shop branch location where stock and sales can be tracked."
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
          <Label htmlFor="branchName" className="text-sm font-medium">
            Branch Name
          </Label>
          <Input
            id="branchName"
            type="text"
            placeholder="e.g. Annex Branch"
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
            {isSubmitting ? 'Creating…' : 'Create Branch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
