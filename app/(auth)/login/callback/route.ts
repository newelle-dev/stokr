import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Lives under /login so the proxy treats it as public; the magic link lands here.
// New owner (no profile) goes to onboarding; active owner goes to the dashboard.
// Anyone else is signed out and sent back to the login page.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const base = request.nextUrl.origin;
  if (!code) return NextResponse.redirect(`${base}/login?error=expired`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${base}/login?error=expired`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile) return NextResponse.redirect(`${base}/onboarding`);

  if (!profile.is_active || profile.role !== 'owner') {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${base}/login?error=incorrect`);
  }

  return NextResponse.redirect(`${base}/dashboard`);
}
