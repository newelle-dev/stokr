import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from '@/features/onboarding/components/onboarding-form';
import { STORE_CODE_COOKIE } from '@/features/onboarding/constants';

// Only a signed-in user may see onboarding. A user who already has a profile goes to the
// dashboard, unless they have just created a shop and the store code is still waiting to be shown.
export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle();

  const pendingStoreCode = (await cookies()).get(STORE_CODE_COOKIE)?.value;
  if (profile && !pendingStoreCode) redirect('/dashboard');

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <OnboardingForm initialStoreCode={profile ? pendingStoreCode ?? null : null} />
    </main>
  );
}
