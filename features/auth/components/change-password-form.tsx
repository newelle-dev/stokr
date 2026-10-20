'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import { changePasswordSchema, type ChangePasswordInput } from '../schemas';
import { completePasswordChangeAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/logo';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

interface ChangePasswordFormProps {
  mustChangePassword: boolean;
  username?: string | null;
}

export function ChangePasswordForm({
  mustChangePassword,
  username,
}: ChangePasswordFormProps) {
  const router = useRouter();
  const [genericError, setGenericError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setGenericError(null);
    setIsSubmitting(true);

    try {
      const result = await completePasswordChangeAction(data);
      if (!result.ok) {
        setGenericError(result.error.message);
        setIsSubmitting(false);
        return;
      }

      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      setGenericError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-sm border-[var(--border)] bg-[var(--card)] shadow-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex justify-center">
          <Logo height={20} width={192} />
        </div>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          {mustChangePassword ? 'Create New Password' : 'Change Password'}
        </CardTitle>
        <CardDescription className="text-sm text-[var(--muted-foreground)]">
          {mustChangePassword
            ? `Welcome${username ? `, ${username}` : ''}! You must set a permanent password (at least 10 characters) before continuing.`
            : 'Enter your current password and your new password.'}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {genericError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm font-medium text-[var(--destructive)]"
            >
              <span>{genericError}</span>
            </div>
          )}

          {!mustChangePassword && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm font-medium text-[var(--foreground)]">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className="h-12 pr-10 text-base"
                  disabled={isSubmitting}
                  {...register('currentPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-[var(--destructive)]">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium text-[var(--foreground)]">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 10 characters"
                className="h-12 pr-10 text-base"
                disabled={isSubmitting}
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.newPassword ? (
              <p className="text-xs text-[var(--destructive)]">
                {errors.newPassword.message}
              </p>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">
                Minimum 10 characters. Avoid common or reused passwords.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-[var(--foreground)]">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                className="h-12 pr-10 text-base"
                disabled={isSubmitting}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-[var(--destructive)]">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="mt-2 h-12 w-full text-base font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Updating password…'
            ) : (
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>Save Password</span>
              </span>
            )}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
