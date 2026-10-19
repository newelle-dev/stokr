'use client';

import * as React from 'react';
import { logoutAction } from '@/features/auth/actions';
import { Button } from '@/components/ui/button';

export function SignOutButton({ className }: { className?: string }) {
  const [isPending, startTransition] = React.useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={isPending}
      className={className}
    >
      {isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}
