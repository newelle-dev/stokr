import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from '@/features/onboarding/components/onboarding-form';

// Only a signed-in user with no profile may see onboarding. Anyone else is routed on.
export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profile) redirect('/dashboard');

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <OnboardingForm />
    </main>
  );
}
