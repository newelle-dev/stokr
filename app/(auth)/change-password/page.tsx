import { Metadata } from 'next';
import { requirePasswordChangePage } from '@/lib/auth';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Change Password | Stokr',
  description: 'Update your account password',
};

export default async function ChangePasswordPage() {
  const user = await requirePasswordChangePage();

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <ChangePasswordForm
        mustChangePassword={user.mustChangePassword}
        username={user.username}
      />
    </div>
  );
}
