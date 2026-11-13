'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { ownerLoginSchema, type OwnerLoginInput } from '../schemas';
import { ownerLoginAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function OwnerLoginForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<OwnerLoginInput>({
    resolver: zodResolver(ownerLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: OwnerLoginInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await ownerLoginAction(data);
      if (!result.ok) {
        setError(result.error.message);
        setIsSubmitting(false);
        return;
      }
      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      setError('Incorrect login details');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm font-medium text-[var(--destructive)]"
        >
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="ownerEmail" className="text-sm font-medium text-[var(--foreground)]">
          Email
        </Label>
        <Input
          id="ownerEmail"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="you@example.com"
          className="h-12 text-base"
          disabled={isSubmitting}
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-[var(--destructive)]">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownerPassword" className="text-sm font-medium text-[var(--foreground)]">
          Password
        </Label>
        <div className="relative">
          <Input
            id="ownerPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••••"
            className="h-12 pr-10 text-base"
            disabled={isSubmitting}
            {...form.register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {form.formState.errors.password && (
          <p className="text-xs text-[var(--destructive)]">{form.formState.errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="mt-2 h-12 w-full text-base font-semibold" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign In as Owner'}
      </Button>
    </form>
  );
}
