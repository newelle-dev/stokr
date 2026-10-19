'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginInput } from '../schemas';
import { loginAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

export function LoginForm() {
  const router = useRouter();
  const [genericError, setGenericError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setGenericError(null);
    setIsSubmitting(true);

    try {
      const result = await loginAction(data);

      if (!result.ok) {
        setGenericError(result.error.message);
        setIsSubmitting(false);
        return;
      }

      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      setGenericError('Incorrect email or password');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-sm border-[var(--border)] bg-[var(--card)] shadow-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
          S
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Sign in to Stokr
        </CardTitle>
        <CardDescription className="text-sm text-[var(--muted-foreground)]">
          Enter your shop credentials to access your account
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

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-[var(--foreground)]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              placeholder="name@shop.local"
              className="h-12 text-base"
              disabled={isSubmitting}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-[var(--destructive)]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-[var(--foreground)]">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-12 text-base"
              disabled={isSubmitting}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-[var(--destructive)]">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button
            type="submit"
            className="h-12 w-full text-base font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
