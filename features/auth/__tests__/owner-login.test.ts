import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));

const signInWithPassword = vi.fn();
const signOut = vi.fn();
let profileRow: { role: string; is_active: boolean } | null = null;
let profileError: { message: string } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { signInWithPassword, signOut },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: profileRow, error: profileError }) }),
      }),
    }),
  }),
}));

import { ownerLoginAction } from '@/features/auth/actions';

const input = { email: 'owner@shop.test', password: 'a-good-password' };

describe('ownerLoginAction', () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    signOut.mockReset();
    profileRow = null;
    profileError = null;
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  it('signs out with the generic error when the profile lookup fails', async () => {
    profileError = { message: 'connection reset' };
    const result = await ownerLoginAction(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('Incorrect login details');
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('rejects a malformed email without calling Supabase', async () => {
    const result = await ownerLoginAction({ email: 'nope', password: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_CREDENTIALS');
      expect(result.error.message).toBe('Incorrect login details');
    }
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('gives the same reply for a wrong password as for a bad email format', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } });
    const wrong = await ownerLoginAction(input);
    const bad = await ownerLoginAction({ email: 'nope', password: 'x' });
    expect(wrong).toEqual(bad);
  });

  it('sends a signed-in user with no profile to onboarding and keeps the session', async () => {
    profileRow = null;
    const result = await ownerLoginAction(input);
    expect(result.ok && result.data.redirectTo).toBe('/onboarding');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('signs out an inactive owner and returns the generic error', async () => {
    profileRow = { role: 'owner', is_active: false };
    const result = await ownerLoginAction(input);
    expect(result.ok).toBe(false);
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('signs out a staff profile typed into the owner form', async () => {
    profileRow = { role: 'staff', is_active: true };
    const result = await ownerLoginAction(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('Incorrect login details');
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('sends an active owner to the dashboard', async () => {
    profileRow = { role: 'owner', is_active: true };
    const result = await ownerLoginAction(input);
    expect(result.ok && result.data.redirectTo).toBe('/dashboard');
  });
});
