import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { RECOVERY_COOKIE } from '@/features/auth/constants';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reset Password | Stokr',
  description: 'Choose a new password',
};

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  const jar = await cookies();
  if (!user || !jar.get(RECOVERY_COOKIE)) redirect('/login/forgot?expired=1');

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <ChangePasswordForm mustChangePassword={false} reset />
    </div>
  );
}
