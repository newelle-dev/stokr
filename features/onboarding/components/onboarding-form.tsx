'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { onboardingSchema, type OnboardingInput } from '../schemas';
import { createShopAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function OnboardingForm() {
  const router = useRouter();
  const [shopName, setShopName] = React.useState('');
  const [branchName, setBranchName] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [storeCode, setStoreCode] = React.useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const input: OnboardingInput = { shopName, branchName, newPassword, confirmPassword };
    const parsed = onboardingSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createShopAction(input);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setStoreCode(result.data.storeCode);
    } catch {
      setError('Could not set up your shop. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (storeCode) {
    return (
      <Card className="w-full border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Your shop is ready</CardTitle>
          <CardDescription>Write down your store code. Staff need it to sign in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-[var(--radius-md)] bg-[var(--muted)] p-4 text-center font-mono text-3xl tracking-widest">
            {storeCode}
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            This is the only time this code is shown.
          </p>
          <Button className="h-12 w-full text-base font-semibold" onClick={() => router.push('/dashboard')}>
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const passwordType = showPassword ? 'text' : 'password';

  return (
    <Card className="w-full border-[var(--border)] bg-[var(--card)]">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Set up your shop</CardTitle>
        <CardDescription>
          Add your shop and first branch, and choose your own password. You will add products next.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {error && (
            <p role="alert" className="text-sm text-[var(--destructive)]">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="shopName">Shop name</Label>
            <Input
              id="shopName"
              className="h-12 text-base"
              value={shopName}
              disabled={isSubmitting}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchName">First branch name</Label>
            <Input
              id="branchName"
              className="h-12 text-base"
              placeholder="e.g. Main"
              value={branchName}
              disabled={isSubmitting}
              onChange={(e) => setBranchName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={passwordType}
                autoComplete="new-password"
                className="h-12 pr-10 text-base"
                value={newPassword}
                disabled={isSubmitting}
                onChange={(e) => setNewPassword(e.target.value)}
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
            <p className="text-xs text-[var(--muted-foreground)]">At least 10 characters.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type={passwordType}
              autoComplete="new-password"
              className="h-12 text-base"
              value={confirmPassword}
              disabled={isSubmitting}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={isSubmitting}>
            {isSubmitting ? 'Setting up…' : 'Create my shop'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
