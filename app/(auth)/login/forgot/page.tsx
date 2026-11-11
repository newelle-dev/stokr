import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

export const metadata = {
  title: 'Forgot Password | Stokr',
  description: 'Reset your Stokr owner password.',
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-4">
      <ForgotPasswordForm expired={expired === '1'} />
    </main>
  );
}
