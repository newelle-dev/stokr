'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

// Starts Google sign-in. The return address is this page's own origin, which is
// the browser's address, not a request header; Supabase still checks it against its allowed list.
export function GoogleSignInButton() {
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onClick = async () => {
    setError(null);
    setIsSubmitting(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login/callback` },
    });
    if (oauthError) {
      setError('Could not start Google sign-in. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base font-semibold"
        disabled={isSubmitting}
        onClick={onClick}
      >
        {isSubmitting ? 'Opening Google…' : 'Continue with Google'}
      </Button>
    </div>
  );
}
