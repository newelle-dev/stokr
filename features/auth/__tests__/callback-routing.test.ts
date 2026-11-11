import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const exchangeCodeForSession = vi.fn();
const signOut = vi.fn();
const maybeSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession, signOut },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    }),
  }),
}));

import { GET } from '@/app/(auth)/login/callback/route';

function call(code: string | null) {
  const url = code
    ? `https://stokr.test/login/callback?code=${code}`
    : 'https://stokr.test/login/callback';
  return GET(new NextRequest(url));
}

describe('magic-link callback routing', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    signOut.mockReset();
    maybeSingle.mockReset();
    exchangeCodeForSession.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  it('sends a new user with no profile to onboarding', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await call('abc');
    expect(res.headers.get('location')).toBe('https://stokr.test/onboarding');
  });

  it('sends an active owner to the dashboard', async () => {
    maybeSingle.mockResolvedValue({ data: { role: 'owner', is_active: true }, error: null });
    const res = await call('abc');
    expect(res.headers.get('location')).toBe('https://stokr.test/dashboard');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('signs out an inactive owner and returns to login', async () => {
    maybeSingle.mockResolvedValue({ data: { role: 'owner', is_active: false }, error: null });
    const res = await call('abc');
    expect(signOut).toHaveBeenCalled();
    expect(res.headers.get('location')).toBe('https://stokr.test/login?error=incorrect');
  });

  it('rejects a request with no code', async () => {
    const res = await call(null);
    expect(res.headers.get('location')).toBe('https://stokr.test/login?error=expired');
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
