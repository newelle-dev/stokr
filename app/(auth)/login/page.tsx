import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from '@/features/auth/components/login-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign In | Stokr',
  description: 'Sign in to Stokr sales and inventory management.',
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
