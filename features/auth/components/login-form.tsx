'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Store, Shield } from 'lucide-react';
import {
  loginSchema,
  staffLoginSchema,
  type LoginInput,
  type StaffLoginInput,
} from '../schemas';
import { loginAction, staffLoginAction } from '../actions';
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

type LoginMode = 'staff' | 'owner';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = React.useState<LoginMode>('staff');
  const [genericError, setGenericError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  // Staff Form
  const staffForm = useForm<StaffLoginInput>({
    resolver: zodResolver(staffLoginSchema),
    defaultValues: {
      storeCode: '',
      username: '',
      password: '',
    },
  });

  // Owner Form
  const ownerForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onStaffSubmit = async (data: StaffLoginInput) => {
    setGenericError(null);
    setIsSubmitting(true);

    try {
      const result = await staffLoginAction(data);
      if (!result.ok) {
        setGenericError(result.error.message);
        setIsSubmitting(false);
        return;
      }
      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      setGenericError('Incorrect login details');
      setIsSubmitting(false);
    }
  };

  const onOwnerSubmit = async (data: LoginInput) => {
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
      setGenericError('Incorrect login details');
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    setGenericError(null);
    setShowPassword(false);
  };

  return (
    <Card className="w-full max-w-sm border-[var(--border)] bg-[var(--card)] shadow-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex justify-center">
          <Logo height={20} width={192} />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Sign In
        </CardTitle>
        <CardDescription className="text-sm text-[var(--muted-foreground)]">
          {mode === 'staff'
            ? 'Enter your store code, username, and password'
            : 'Enter your owner email and password'}
        </CardDescription>

        {/* Mode Selector Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-[var(--radius-md)] bg-[var(--muted)] p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => switchMode('staff')}
            className={`flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-2 transition-all ${
              mode === 'staff'
                ? 'bg-[var(--card)] text-[var(--foreground)] shadow-xs'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>Staff</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('owner')}
            className={`flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-2 transition-all ${
              mode === 'owner'
                ? 'bg-[var(--card)] text-[var(--foreground)] shadow-xs'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Owner</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {genericError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm font-medium text-[var(--destructive)]"
          >
            <span>{genericError}</span>
          </div>
        )}

        {mode === 'staff' ? (
          <form onSubmit={staffForm.handleSubmit(onStaffSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeCode" className="text-sm font-medium text-[var(--foreground)]">
                Store Code
              </Label>
              <Input
                id="storeCode"
                type="text"
                autoComplete="organization"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="e.g. cloudhaven"
                className="h-12 text-base lowercase"
                disabled={isSubmitting}
                {...staffForm.register('storeCode')}
              />
              {staffForm.formState.errors.storeCode && (
                <p className="text-xs text-[var(--destructive)]">
                  {staffForm.formState.errors.storeCode.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-[var(--foreground)]">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="e.g. staff1"
                className="h-12 text-base lowercase"
                disabled={isSubmitting}
                {...staffForm.register('username')}
              />
              {staffForm.formState.errors.username && (
                <p className="text-xs text-[var(--destructive)]">
                  {staffForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffPassword" className="text-sm font-medium text-[var(--foreground)]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="staffPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className="h-12 pr-10 text-base"
                  disabled={isSubmitting}
                  {...staffForm.register('password')}
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
              {staffForm.formState.errors.password && (
                <p className="text-xs text-[var(--destructive)]">
                  {staffForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-2 h-12 w-full text-base font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign In as Staff'}
            </Button>
          </form>
        ) : (
          <form onSubmit={ownerForm.handleSubmit(onOwnerSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[var(--foreground)]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                placeholder="owner@shop.local"
                className="h-12 text-base"
                disabled={isSubmitting}
                {...ownerForm.register('email')}
              />
              {ownerForm.formState.errors.email && (
                <p className="text-xs text-[var(--destructive)]">
                  {ownerForm.formState.errors.email.message}
                </p>
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
                  {...ownerForm.register('password')}
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
              {ownerForm.formState.errors.password && (
                <p className="text-xs text-[var(--destructive)]">
                  {ownerForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-2 h-12 w-full text-base font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign In as Owner'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
