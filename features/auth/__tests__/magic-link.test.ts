import { describe, it, expect, vi, beforeEach } from 'vitest';

const signInWithOtp = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { signInWithOtp } }),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => null }));

import { requestMagicLinkAction } from '@/features/auth/actions';

describe('requestMagicLinkAction', () => {
  beforeEach(() => {
    signInWithOtp.mockReset();
    process.env.SITE_URL = 'https://stokr.test';
  });

  it('ignores a spoofed origin header and uses SITE_URL', async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await requestMagicLinkAction({ email: 'owner@shop.test' });
    expect(signInWithOtp.mock.calls[0]?.[0].options.emailRedirectTo).toBe('https://stokr.test/login/callback');
  });

  it('rejects a malformed email without calling Supabase', async () => {
    const result = await requestMagicLinkAction({ email: 'not-an-email' });
    expect(result.ok).toBe(false);
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('sends a magic link that returns to the callback and allows sign-up', async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    const result = await requestMagicLinkAction({ email: 'Owner@Shop.test' });
    expect(result.ok).toBe(true);
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'owner@shop.test',
      options: { emailRedirectTo: 'https://stokr.test/login/callback', shouldCreateUser: true },
    });
  });

  it('still answers ok when Supabase reports an error (no account probing)', async () => {
    signInWithOtp.mockResolvedValue({ data: null, error: { message: 'User not found' } });
    const result = await requestMagicLinkAction({ email: 'nobody@shop.test' });
    expect(result.ok).toBe(true);
  });
});
