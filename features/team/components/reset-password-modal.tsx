'use client';

import * as React from 'react';
import { Copy, Check, ShieldAlert, KeyRound } from 'lucide-react';
import { resetStaffPasswordAction } from '../actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { TeamMemberItem } from '../types';

interface ResetPasswordModalProps {
  staff: TeamMemberItem | null;
  storeCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ResetPasswordModal({
  staff,
  storeCode,
  isOpen,
  onClose,
}: ResetPasswordModalProps) {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  if (!staff) return null;

  const handleReset = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await resetStaffPasswordAction({ staffId: staff.id });
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      setTempPassword(result.data.tempPassword);
    } catch {
      setErrorMsg('Failed to reset staff password. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!tempPassword) return;
    const text = [
      `Stokr Password Reset:`,
      `Store Code: ${storeCode}`,
      `Username: ${staff.username}`,
      `New Temporary Password: ${tempPassword}`,
      `\nYou must set a new password on your next login.`,
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
    setErrorMsg(null);
    setTempPassword(null);
    setCopied(false);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={tempPassword ? 'Password Reset Successful' : `Reset Password for ${staff.fullName}?`}
      description={
        tempPassword
          ? 'Share this new temporary password with your staff member.'
          : `This will generate a new temporary password for ${staff.username} and force them to change it upon next login.`
      }
    >
      {tempPassword ? (
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
                Copy and deliver this password to {staff.fullName}. Their previous password has been revoked.
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--muted)]/40 p-4 space-y-2.5 font-mono text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]/60">
              <span className="text-xs font-sans text-[var(--muted-foreground)]">Store Code</span>
              <span className="font-bold text-[var(--foreground)]">{storeCode}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]/60">
              <span className="text-xs font-sans text-[var(--muted-foreground)]">Username</span>
              <span className="font-bold text-[var(--foreground)]">{staff.username}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-sans text-[var(--muted-foreground)]">New Temp Password</span>
              <span className="font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-[var(--radius-sm)]">
                {tempPassword}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              onClick={handleCopy}
              className="h-11 w-full gap-2 font-semibold"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Password Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Reset Credentials</span>
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
        <div className="space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)] font-medium"
            >
              {errorMsg}
            </div>
          )}

          <p className="text-sm text-[var(--muted-foreground)]">
            Are you sure you want to reset the password for <strong className="text-[var(--foreground)]">{staff.fullName}</strong> (<span className="font-mono">{staff.username}</span>)? A secure temporary password will be generated for them.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <KeyRound className="h-4 w-4" />
              <span>{isSubmitting ? 'Resetting…' : 'Generate New Password'}</span>
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
