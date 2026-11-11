'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { magicLinkSchema, type MagicLinkInput } from '../schemas';
import { requestMagicLinkAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function MagicLinkForm() {
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: MagicLinkInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await requestMagicLinkAction(data);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <p role="status" className="rounded-[var(--radius-md)] bg-[var(--muted)] p-3 text-sm text-[var(--foreground)]">
        Check your email for a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="magicEmail" className="text-sm font-medium text-[var(--foreground)]">
          Email
        </Label>
        <Input
          id="magicEmail"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="owner@shop.local"
          className="h-12 text-base"
          disabled={isSubmitting}
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-[var(--destructive)]">{form.formState.errors.email.message}</p>
        )}
      </div>
      <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Email me a sign-in link'}
      </Button>
    </form>
  );
}
