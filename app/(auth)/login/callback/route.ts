import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RECOVERY_COOKIE } from '@/features/auth/constants';

// Lives under /login so the proxy treats it as public; the reset email link lands here.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const base = request.nextUrl.origin;
  if (!code) return NextResponse.redirect(`${base}/login/forgot?expired=1`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${base}/login/forgot?expired=1`);

  const res = NextResponse.redirect(`${base}/reset-password`);
  res.cookies.set(RECOVERY_COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
