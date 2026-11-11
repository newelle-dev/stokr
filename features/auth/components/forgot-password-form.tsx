'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../schemas';
import { requestPasswordResetAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/logo';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function ForgotPasswordForm({ expired = false }: { expired?: boolean }) {
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    expired ? 'That reset link has expired or was already used. Request a new one.' : null
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await requestPasswordResetAction(data);
      if (!result.ok) setError(result.error.message);
      else setSent(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="w-full max-w-sm border-[var(--border)] bg-[var(--card)] shadow-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex justify-center">
          <Logo height={20} width={192} />
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Forgot password
        </CardTitle>
        <CardDescription className="text-sm text-[var(--muted-foreground)]">
          Owners only. Staff should ask the owner to reset their password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent ? (
          <p role="status" className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm text-[var(--foreground)]">
            If that email belongs to an owner account, a reset link is on its way. It works for a short time only.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div role="alert" className="rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm font-medium text-[var(--destructive)]">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="resetEmail" className="text-sm font-medium text-[var(--foreground)]">
                Owner email
              </Label>
              <Input
                id="resetEmail"
                type="email"
                autoComplete="email"
                className="h-12 text-base"
                disabled={isSubmitting}
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-[var(--destructive)]">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
        <Link href="/login" className="flex h-11 items-center justify-center text-sm text-[var(--primary)] hover:underline">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
