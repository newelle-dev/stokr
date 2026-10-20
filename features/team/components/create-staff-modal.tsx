'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Check, ShieldAlert, KeyRound } from 'lucide-react';
import { createStaffSchema, type CreateStaffInput } from '../schemas';
import { createStaffAction, type CreatedStaffResult } from '../actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateStaffModalProps {
  branches: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStaffModal({
  branches,
  isOpen,
  onClose,
}: CreateStaffModalProps) {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createdResult, setCreatedResult] = React.useState<CreatedStaffResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      fullName: '',
      username: '',
      branchId: branches[0]?.id ?? '',
    },
  });

  const onSubmit = async (data: CreateStaffInput) => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await createStaffAction(data);
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      setCreatedResult(result.data);
    } catch {
      setErrorMsg('Failed to create staff member. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdResult) return;
    const text = [
      `Stokr Staff Login Credentials:`,
      `Store Code: ${createdResult.storeCode}`,
      `Username: ${createdResult.username}`,
      `Temporary Password: ${createdResult.tempPassword}`,
      `\nYou will be required to change your password on first login.`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleClose = () => {
    reset();
    setErrorMsg(null);
    setCreatedResult(null);
    setCopied(false);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdResult ? 'Staff Account Created' : 'Add Staff Member'}
      description={
        createdResult
          ? 'Share these temporary login credentials with your staff member.'
          : 'Create a staff login with an assigned branch and temporary password.'
      }
    >
      {createdResult ? (
        <div className="space-y-4">
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-3.5 text-sm"
          >
            <ShieldAlert className="h-5 w-5 shrink-0 text-[var(--warning)] mt-0.5" />
            <div className="text-xs text-[var(--foreground)] space-y-1">
              <p className="font-semibold text-[var(--warning)] text-sm">
                Temporary password is shown only once!
              </p>
              <p className="text-[var(--muted-foreground)]">
                Copy these credentials now. The staff member will use them to sign in and will be immediately prompted to set their own permanent password.
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--muted)]/40 p-4 space-y-3 font-mono text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]/60">
              <span className="text-xs font-sans text-[var(--muted-foreground)]">Full Name</span>
              <span className="font-semibold text-[var(--foreground)] font-sans">{createdResult.fullName}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]/60">
              <span className="text-xs font-sans text-[var(--muted-foreground)]">Store Code</span>
              <span className="font-bold text-[var(--foreground)]">{createdResult.storeCode}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]/60">
              <span className="text-xs font-sans text-[var(--muted-foreground)]">Username</span>
              <span className="font-bold text-[var(--foreground)]">{createdResult.username}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-sans text-[var(--muted-foreground)]">Temp Password</span>
              <span className="font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-[var(--radius-sm)]">
                {createdResult.tempPassword}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              onClick={handleCopyCredentials}
              className="h-11 w-full gap-2 font-semibold"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Credentials Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Login Credentials</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-10 w-full"
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
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
            <Label htmlFor="staffFullName" className="text-sm font-medium">
              Full Name
            </Label>
            <Input
              id="staffFullName"
              type="text"
              placeholder="e.g. Maria Santos"
              className="h-11"
              disabled={isSubmitting}
              {...register('fullName')}
            />
            {errors.fullName && (
              <p className="text-xs text-[var(--destructive)]">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffUsername" className="text-sm font-medium">
              Username
            </Label>
            <Input
              id="staffUsername"
              type="text"
              placeholder="e.g. maria.s"
              autoCapitalize="none"
              autoCorrect="off"
              className="h-11 font-mono text-sm lowercase"
              disabled={isSubmitting}
              {...register('username')}
            />
            {errors.username ? (
              <p className="text-xs text-[var(--destructive)]">
                {errors.username.message}
              </p>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">
                Lowercase letters, numbers, dots, and hyphens (3-30 characters).
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffBranch" className="text-sm font-medium">
              Assigned Branch
            </Label>
            <select
              id="staffBranch"
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
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              <KeyRound className="h-4 w-4" />
              <span>{isSubmitting ? 'Creating…' : 'Generate Staff Account'}</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
