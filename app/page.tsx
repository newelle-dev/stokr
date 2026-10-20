import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

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
