import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Root page acts as the role dispatcher.
 * Unauthenticated users are redirected to /login.
 * Owners land on /dashboard.
 * Staff land on /sell.
 */
export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    // Signed in but no profile yet = a new owner: go to onboarding. Sending them
    // to /login would loop, because the proxy bounces signed-in users back to /.
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();
      if (!profile) redirect('/onboarding');
    }
    redirect('/login');
  }

  if (user.mustChangePassword) {
    redirect('/change-password');
  }

  if (user.role === 'owner') {
    redirect('/dashboard');
  }

  redirect('/sell');
}
